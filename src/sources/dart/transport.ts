import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { ResponseError as HttpClientResponseError } from "@effect/platform/HttpClientError";
import type { HttpClientResponse as HttpClientResponseType } from "@effect/platform/HttpClientResponse";
import { Effect, Layer, Stream } from "effect";

import {
  createCauseDiagnostics,
  mergeErrorDiagnostics,
} from "../../error-diagnostics.ts";
import {
  toHttpFailureDiagnostics,
  toHttpResponseDiagnostics,
  toWebResponseDiagnostics,
} from "./http-diagnostics.ts";
import { ParseFailure, SourceUnavailable } from "./errors.ts";
import {
  createDartSourceTextResponse,
  type DartSourceTextResponse,
} from "./source-response.ts";

/**
 * DART source transport policy.  The four vertical operations use the limits
 * in dart-html-viewer-v1; the three shipped-only reads use 8 MiB because their
 * observed result shapes are bounded HTML fragments/details or a small RSS
 * feed, and no larger retained payload is required by their public contracts.
 */
export const dartTransportLimits = {
  searchCompany: 8 * 1024 * 1024,
  searchCompanyReports: 8 * 1024 * 1024,
  reportShell: 16 * 1024 * 1024,
  reportContent: 64 * 1024 * 1024,
  searchBody: 8 * 1024 * 1024,
  companyDetail: 8 * 1024 * 1024,
  companyRss: 8 * 1024 * 1024,
} as const;

export const dartTransportDeadlines = {
  connectMs: 5_000,
  idleMs: 10_000,
  totalMs: 30_000,
} as const;

export const dartOrigin = "https://dart.fss.or.kr";

export type DartResponseKind = "html" | "xml";

export type DartTextTransportPolicy = {
  readonly sourceUrl: string;
  readonly unavailableMessage: string;
  readonly parseFailureMessage: string;
  readonly maxBytes: number;
  readonly responseKind: DartResponseKind;
};

type CollectedBytes = {
  readonly chunks: Uint8Array[];
  readonly byteLength: number;
};

class DartConnectTimeout extends Error {
  constructor() {
    super(`DART connection exceeded ${dartTransportDeadlines.connectMs}ms.`);
    this.name = "DartConnectTimeout";
  }
}

class DartIdleTimeout extends Error {
  constructor() {
    super(`DART response was idle for ${dartTransportDeadlines.idleMs}ms.`);
    this.name = "DartIdleTimeout";
  }
}

class DartTotalTimeout extends Error {
  constructor() {
    super(`DART request exceeded ${dartTransportDeadlines.totalMs}ms.`);
    this.name = "DartTotalTimeout";
  }
}

class DartResponseTooLarge extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super(`DART response exceeded the ${maxBytes}-byte limit.`);
    this.name = "DartResponseTooLarge";
    this.maxBytes = maxBytes;
  }
}

class DartEmptyResponse extends Error {
  constructor() {
    super("DART response body was empty.");
    this.name = "DartEmptyResponse";
  }
}

class DartUnsupportedMediaType extends Error {
  readonly contentType: string | undefined;

  constructor(contentType: string | undefined) {
    super("DART response media type is not supported.");
    this.name = "DartUnsupportedMediaType";
    this.contentType = contentType;
  }
}

class DartUnsupportedCharset extends Error {
  readonly charset: string;

  constructor(charset: string) {
    super(`DART response charset is not supported: ${charset}.`);
    this.name = "DartUnsupportedCharset";
    this.charset = charset;
  }
}

/**
 * The FetchHttpClient layer follows redirects by default. Manual redirect
 * handling leaves 3xx responses visible so the exact-200 policy can reject
 * them before any body is consumed.
 */
export const dartFetchHttpClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, {
      redirect: "manual",
    }),
  ),
);

const parseDartUrl = (sourceUrl: string): URL | undefined => {
  try {
    const parsed = new URL(sourceUrl);

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "dart.fss.or.kr" ||
      parsed.port !== "" ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
};

const responseContentType = (
  response: Pick<HttpClientResponseType, "headers">,
): string | undefined => response.headers["content-type"];

const mediaTypeFromContentType = (
  contentType: string | undefined,
): string | undefined =>
  contentType?.split(";", 1)[0]?.trim().toLowerCase() || undefined;

const charsetFromContentType = (
  contentType: string | undefined,
): string | undefined => {
  const match = /(?:^|;)\s*charset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;\s]*))/i.exec(
    contentType ?? "",
  );

  return (match?.[1] ?? match?.[2] ?? match?.[3])?.trim().toLowerCase();
};

/** Returns the normalized WHATWG decoder label or fails for unknown labels. */
export const resolveDartCharset = (
  contentType: string | undefined,
): "utf-8" | "euc-kr" => {
  const charset = charsetFromContentType(contentType);

  if (
    charset === undefined ||
    charset === "utf-8" ||
    charset === "utf8"
  ) {
    return "utf-8";
  }

  if (
    charset === "ms949" ||
    charset === "euc-kr" ||
    charset === "ks_c_5601-1987"
  ) {
    return "euc-kr";
  }

  throw new DartUnsupportedCharset(charset);
};

const expectedMediaType = (responseKind: DartResponseKind): string =>
  responseKind === "xml" ? "application/xml, text/xml, application/rss+xml" : "text/html";

const isExpectedMediaType = (
  contentType: string | undefined,
  responseKind: DartResponseKind,
): boolean => {
  const mediaType = mediaTypeFromContentType(contentType);

  if (responseKind === "html") {
    return mediaType === "text/html";
  }

  return (
    mediaType === "application/xml" ||
    mediaType === "text/xml" ||
    mediaType === "application/rss+xml"
  );
};

const allocateBytes = (collected: CollectedBytes): Uint8Array => {
  const bytes = new Uint8Array(collected.byteLength);
  let offset = 0;

  for (const chunk of collected.chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
};

const collectResponseBytes = (
  response: HttpClientResponseType,
  maxBytes: number,
): Effect.Effect<CollectedBytes, DartResponseTooLarge | Error> =>
  response.stream.pipe(
    Stream.timeoutFail(() => new DartIdleTimeout(), dartTransportDeadlines.idleMs),
    Stream.runFoldEffect(
      {
        chunks: [] as Uint8Array[],
        byteLength: 0,
      },
      (state, chunk) => {
        const byteLength = state.byteLength + chunk.byteLength;

        if (byteLength > maxBytes) {
          return Effect.fail(new DartResponseTooLarge(maxBytes));
        }

        state.chunks.push(chunk);
        state.byteLength = byteLength;
        return Effect.succeed(state);
      },
    ),
    Effect.mapError((error) =>
      error instanceof DartResponseTooLarge
        ? error
        : error instanceof HttpClientResponseError && error.reason === "EmptyBody"
          ? new DartEmptyResponse()
        : error instanceof Error
          ? error
          : new Error(String(error)),
    ),
  );

const responseDiagnostics = (
  response: HttpClientResponseType,
  responseText?: string,
) => toHttpResponseDiagnostics(response, responseText);

const toParseFailure = (
  policy: DartTextTransportPolicy,
  response: HttpClientResponseType,
  reason: string,
  cause?: unknown,
): ParseFailure =>
  new ParseFailure({
    message: policy.parseFailureMessage,
    sourceUrl: policy.sourceUrl,
    diagnostics: mergeErrorDiagnostics(
      responseDiagnostics(response),
      { parseReason: reason },
      cause === undefined ? undefined : createCauseDiagnostics(cause),
    ),
  });

const toSourceUnavailable = (
  policy: DartTextTransportPolicy,
  cause: unknown,
  response?: HttpClientResponseType,
): SourceUnavailable =>
  new SourceUnavailable({
    message: policy.unavailableMessage,
    sourceUrl: policy.sourceUrl,
    diagnostics:
      response === undefined
        ? toHttpFailureDiagnostics(cause)
        : mergeErrorDiagnostics(responseDiagnostics(response), createCauseDiagnostics(cause)),
  });

const toWebSourceUnavailable = (
  policy: DartTextTransportPolicy,
  cause: unknown,
  response: Response,
): SourceUnavailable =>
  new SourceUnavailable({
    message: policy.unavailableMessage,
    sourceUrl: policy.sourceUrl,
    diagnostics: mergeErrorDiagnostics(
      toWebResponseDiagnostics(response),
      createCauseDiagnostics(cause),
    ),
  });

const decodeHttpResponse = (
  response: HttpClientResponseType,
  policy: DartTextTransportPolicy,
): Effect.Effect<DartSourceTextResponse, SourceUnavailable | ParseFailure> =>
  Effect.gen(function* () {
    const contentType = responseContentType(response);

    // Check status before media type, charset, or body access. A 429/503 body
    // can be HTML-shaped but is still an unavailable upstream response.
    if (response.status !== 200) {
      return yield* Effect.fail(
        new SourceUnavailable({
          message: policy.unavailableMessage,
          sourceUrl: policy.sourceUrl,
          diagnostics: responseDiagnostics(response),
        }),
      );
    }

    if (!isExpectedMediaType(contentType, policy.responseKind)) {
      return yield* Effect.fail(
        toParseFailure(
          policy,
          response,
          `unsupported media type; expected ${expectedMediaType(policy.responseKind)}`,
          new DartUnsupportedMediaType(contentType),
        ),
      );
    }

    let charset: "utf-8" | "euc-kr";
    try {
      charset = resolveDartCharset(contentType);
    } catch (error) {
      return yield* Effect.fail(
        toParseFailure(policy, response, "unsupported charset", error),
      );
    }

    const collected = yield* collectResponseBytes(response, policy.maxBytes).pipe(
      Effect.mapError((error) =>
        error instanceof DartResponseTooLarge
          ? toParseFailure(
              policy,
              response,
              `response exceeded ${policy.maxBytes} bytes before decoding`,
              error,
            )
          : error instanceof DartEmptyResponse
            ? toParseFailure(policy, response, "empty response body", error)
          : toSourceUnavailable(policy, error, response),
      ),
    );

    if (collected.byteLength === 0) {
      return yield* Effect.fail(
        toParseFailure(policy, response, "empty response body"),
      );
    }

    const bytes = allocateBytes(collected);
    let body: string;

    try {
      body = new TextDecoder(
        charset as ConstructorParameters<typeof TextDecoder>[0],
      ).decode(bytes);
    } catch (error) {
      return yield* Effect.fail(
        toParseFailure(policy, response, "response text decoding failed", error),
      );
    }

    return createDartSourceTextResponse(
      body,
      policy.sourceUrl,
      responseDiagnostics(response, body),
    );
  }).pipe(
    Effect.mapError((error) =>
      error instanceof SourceUnavailable || error instanceof ParseFailure
        ? error
        : toSourceUnavailable(policy, error, response),
    ),
  );

/**
 * Executes and decodes an Effect HttpClient response under the shared DART
 * policy. The outer deadline includes header acquisition and body streaming;
 * the nested deadline bounds the header/connect phase as closely as the
 * runtime's HttpClient abstraction allows.
 */
export const requestDartTextResponse = (
  client: HttpClient.HttpClient,
  request: HttpClientRequest.HttpClientRequest,
  policy: DartTextTransportPolicy,
): Effect.Effect<DartSourceTextResponse, SourceUnavailable | ParseFailure> => {
  const sourceUrl = canonicalizeDartSourceUrl(policy.sourceUrl, dartOrigin);
  const safePolicy = { ...policy, sourceUrl };
  const operation = Effect.gen(function* () {
    if (parseDartUrl(request.url) === undefined) {
      return yield* Effect.fail(
        new SourceUnavailable({
          message: safePolicy.unavailableMessage,
          sourceUrl: safePolicy.sourceUrl,
          diagnostics: {
            parseReason: "invalid or non-DART request URL rejected",
          },
        }),
      );
    }

    const response = yield* client.execute(request).pipe(
      Effect.timeoutFail({
        duration: dartTransportDeadlines.connectMs,
        onTimeout: () => new DartConnectTimeout(),
      }),
      Effect.mapError((error) => toSourceUnavailable(safePolicy, error)),
    );

    return yield* decodeHttpResponse(response, safePolicy);
  });

  return operation.pipe(
    Effect.timeoutFail({
      duration: dartTransportDeadlines.totalMs,
      onTimeout: () => new DartTotalTimeout(),
    }),
    Effect.mapError((error) =>
      error instanceof SourceUnavailable || error instanceof ParseFailure
        ? error
        : toSourceUnavailable(safePolicy, error),
    ),
  );
};

/**
 * Keep source URLs on the DART origin even if an internal caller accidentally
 * supplies a malformed or cross-origin URL. Diagnostics never expose a
 * redirect Location or arbitrary caller-controlled origin.
 */
export const canonicalizeDartSourceUrl = (
  sourceUrl: string,
  fallback: string,
): string => {
  return parseDartUrl(sourceUrl)?.toString() ??
    (parseDartUrl(fallback)?.toString() ?? dartOrigin);
};

export type DartWebTextTransportPolicy = DartTextTransportPolicy;

type WebCollectedBytes = {
  readonly bytes: Uint8Array;
  readonly byteLength: number;
};

// `Response.body` resolves to the platform's Web Streams implementation. Bun
// and Node expose incompatible reader interfaces (`readMany` exists only in
// Bun), so keep the small structural surface needed for cancellation and
// bounded reads instead of naming either runtime's reader type.
type DartReadableStreamReader = {
  readonly read: () => Promise<{
    readonly done: boolean;
    readonly value?: unknown;
  }>;
  readonly cancel: (reason?: unknown) => Promise<void>;
  readonly releaseLock: () => void;
};

const webContentType = (response: Response): string | undefined =>
  response.headers.get("content-type") ?? undefined;

const readWebChunk = async <T>(
  read: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      read,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          onTimeout();
          reject(new DartIdleTimeout());
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};

const collectWebResponseBytes = async (
  response: Response,
  maxBytes: number,
  onIdleTimeout: () => void,
  onReader: (reader: DartReadableStreamReader) => void,
): Promise<WebCollectedBytes> => {
  if (response.body === null) {
    return { bytes: new Uint8Array(), byteLength: 0 };
  }

  const reader = response.body.getReader();
  onReader(reader);
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const result = await readWebChunk(reader.read(), dartTransportDeadlines.idleMs, onIdleTimeout);

      if (result.done) {
        break;
      }

      const chunk = result.value as Uint8Array;
      byteLength += chunk.byteLength;

      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new DartResponseTooLarge(maxBytes);
      }

      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, byteLength };
};

const webResponseDiagnostics = (response: Response, body?: string) =>
  toWebResponseDiagnostics(response, body);

const cancelWebResponseBody = async (response: Response): Promise<void> => {
  if (response.body === null) {
    return;
  }

  try {
    await response.body.cancel();
  } catch {
    // The response is already being rejected; cleanup must not replace its
    // typed classification or expose an upstream body error.
  }
};

/**
 * Web Fetch counterpart used by the shipped report viewer. A per-request
 * AbortController composes caller cancellation with connect, idle, and total
 * deadlines while retaining the caller's signal as a source of cancellation.
 */
export const fetchDartWebTextResponse = async (
  url: string,
  policy: DartWebTextTransportPolicy,
  callerSignal?: AbortSignal,
): Promise<DartSourceTextResponse> => {
  const sourceUrl = canonicalizeDartSourceUrl(policy.sourceUrl, dartOrigin);
  const parsedRequestUrl = parseDartUrl(url);

  if (parsedRequestUrl === undefined) {
    throw new SourceUnavailable({
      message: policy.unavailableMessage,
      sourceUrl,
      diagnostics: {
        parseReason: "invalid or non-DART request URL rejected",
      },
    });
  }

  const controller = new AbortController();
  let deadlineKind: "connect" | "idle" | "total" | undefined;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let totalTimer: ReturnType<typeof setTimeout> | undefined;
  let activeReader: DartReadableStreamReader | undefined;
  let callerAborted = callerSignal?.aborted === true;
  const requestUrl = parsedRequestUrl.toString();

  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort(callerSignal?.reason);
    void activeReader?.cancel().catch(() => undefined);
  };

  if (callerSignal?.aborted === true) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  totalTimer = setTimeout(() => {
    deadlineKind = "total";
    controller.abort(new DartTotalTimeout());
    void activeReader?.cancel().catch(() => undefined);
  }, dartTransportDeadlines.totalMs);
  connectTimer = setTimeout(() => {
    deadlineKind = "connect";
    controller.abort(new DartConnectTimeout());
  }, dartTransportDeadlines.connectMs);

  let response: Response | undefined;

  try {
    try {
      response = await fetch(requestUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      if (callerAborted) {
        throw callerSignal?.reason ?? error;
      }

      throw toSourceUnavailable(
        { ...policy, sourceUrl },
        deadlineKind === undefined ? error : new Error(`${deadlineKind} deadline exceeded`),
      );
    } finally {
      if (connectTimer !== undefined) {
        clearTimeout(connectTimer);
        connectTimer = undefined;
      }
    }

    const contentType = webContentType(response);

    if (response.status !== 200) {
      await cancelWebResponseBody(response);
      throw new SourceUnavailable({
        message: policy.unavailableMessage,
        sourceUrl,
        diagnostics: webResponseDiagnostics(response),
      });
    }

    if (!isExpectedMediaType(contentType, policy.responseKind)) {
      await cancelWebResponseBody(response);
      throw new ParseFailure({
        message: policy.parseFailureMessage,
        sourceUrl,
        diagnostics: mergeErrorDiagnostics(
          webResponseDiagnostics(response),
          {
            parseReason: `unsupported media type; expected ${expectedMediaType(policy.responseKind)}`,
          },
          createCauseDiagnostics(new DartUnsupportedMediaType(contentType)),
        ),
      });
    }

    let charset: "utf-8" | "euc-kr";
    try {
      charset = resolveDartCharset(contentType);
    } catch (error) {
      await cancelWebResponseBody(response);
      throw new ParseFailure({
        message: policy.parseFailureMessage,
        sourceUrl,
        diagnostics: mergeErrorDiagnostics(
          webResponseDiagnostics(response),
          { parseReason: "unsupported charset" },
          createCauseDiagnostics(error),
        ),
      });
    }

    let collected: WebCollectedBytes;
    try {
      collected = await collectWebResponseBytes(response, policy.maxBytes, () => {
        deadlineKind = "idle";
        controller.abort(new DartIdleTimeout());
        void activeReader?.cancel().catch(() => undefined);
      }, (reader) => {
        activeReader = reader;
      });
    } catch (error) {
      if (callerAborted) {
        throw callerSignal?.reason ?? error;
      }

      if (error instanceof DartResponseTooLarge) {
        throw new ParseFailure({
          message: policy.parseFailureMessage,
          sourceUrl,
          diagnostics: mergeErrorDiagnostics(
            webResponseDiagnostics(response),
            {
              parseReason: `response exceeded ${policy.maxBytes} bytes before decoding`,
            },
            createCauseDiagnostics(error),
          ),
        });
      }

      throw toWebSourceUnavailable(
        { ...policy, sourceUrl },
        deadlineKind === undefined ? error : new Error(`${deadlineKind} deadline exceeded`),
        response,
      );
    }

    // Cancelling the reader makes a pending read settle, but it can otherwise
    // look like a clean end-of-stream. Preserve caller/deadline cancellation
    // as an unavailable transport failure instead of decoding a prefix.
    if (callerAborted || deadlineKind !== undefined) {
      if (callerAborted) {
        throw callerSignal?.reason ?? new Error("DART request aborted by caller");
      }

      throw toWebSourceUnavailable(
        { ...policy, sourceUrl },
        callerAborted
          ? new Error("caller aborted DART request")
          : new Error(`${deadlineKind} deadline exceeded`),
        response,
      );
    }

    if (collected.byteLength === 0) {
      throw new ParseFailure({
        message: policy.parseFailureMessage,
        sourceUrl,
        diagnostics: mergeErrorDiagnostics(
          webResponseDiagnostics(response),
          { parseReason: "empty response body" },
        ),
      });
    }

    let body: string;
    try {
      body = new TextDecoder(
        charset as ConstructorParameters<typeof TextDecoder>[0],
      ).decode(collected.bytes);
    } catch (error) {
      throw new ParseFailure({
        message: policy.parseFailureMessage,
        sourceUrl,
        diagnostics: mergeErrorDiagnostics(
          webResponseDiagnostics(response),
          { parseReason: "response text decoding failed" },
          createCauseDiagnostics(error),
        ),
      });
    }

    return createDartSourceTextResponse(
      body,
      sourceUrl,
      webResponseDiagnostics(response, body),
    );
  } finally {
    activeReader = undefined;
    if (totalTimer !== undefined) {
      clearTimeout(totalTimer);
    }
    if (connectTimer !== undefined) {
      clearTimeout(connectTimer);
    }
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
};
