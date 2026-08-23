import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import type { HttpClientResponse as HttpClientResponseType } from "@effect/platform/HttpClientResponse";
import { describe, expect, test } from "bun:test";
import * as Cause from "effect/Cause";
import { Effect } from "effect";
import * as Option from "effect/Option";

import { ParseFailure, SourceUnavailable } from "./errors.ts";
import {
  dartTransportLimits,
  canonicalizeDartSourceUrl,
  fetchDartWebTextResponse,
  requestDartTextResponse,
  resolveDartCharset,
} from "./transport.ts";

const sourceUrl = "https://dart.fss.or.kr/test.ax";

const policy = {
  sourceUrl,
  unavailableMessage: "DART source unavailable.",
  parseFailureMessage: "DART source could not be decoded.",
  maxBytes: 32,
  responseKind: "html" as const,
};

const runEffectResponse = async (
  response: Response | HttpClientResponseType,
  overrides: Partial<typeof policy> = {},
  requestUrl = sourceUrl,
) => {
  const client = HttpClient.make((request) =>
    Effect.succeed(
      response instanceof Response
        ? HttpClientResponse.fromWeb(request, response)
        : response,
    ),
  );

  const exit = await Effect.runPromiseExit(
    requestDartTextResponse(
      client,
      HttpClientRequest.get(requestUrl),
      { ...policy, ...overrides },
    ),
  );

  if (exit._tag === "Success") {
    return exit.value;
  }

  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) {
    throw failure.value;
  }

  throw exit.cause;
};

const withFetch = async <T>(
  implementation: (...args: Parameters<typeof globalThis.fetch>) => Promise<Response>,
  action: () => Promise<T>,
): Promise<T> => {
  const original = globalThis.fetch;
  globalThis.fetch = implementation as typeof globalThis.fetch;

  try {
    return await action();
  } finally {
    globalThis.fetch = original;
  }
};

describe("DART transport policy", () => {
  test("rejects 429 and 503 before consuming HTML-shaped bodies", async () => {
    for (const status of [429, 503]) {
      let streamAccessed = false;
      const response = {
        status,
        headers: { "content-type": "text/html; charset=UTF-8" },
        get stream() {
          streamAccessed = true;
          throw new Error("non-200 body must not be read");
        },
      } as unknown as HttpClientResponseType;

      await expect(
        runEffectResponse(response),
      ).rejects.toBeInstanceOf(SourceUnavailable);
      expect(streamAccessed).toBe(false);
    }
  });

  test("rejects redirects as unavailable and retains the canonical DART URL", async () => {
    let canceled = false;
    const error = await withFetch(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("<html>redirect</html>"));
            },
            cancel() {
              canceled = true;
            },
          }),
          {
          status: 302,
          headers: {
            location: "https://outside.example/redirect",
            "content-type": "text/html; charset=UTF-8",
          },
          },
        ),
      () =>
        fetchDartWebTextResponse(
          sourceUrl,
          policy,
        ).then(
          () => undefined,
          (cause: unknown) => cause,
        ),
    );

    expect(error).toBeInstanceOf(SourceUnavailable);
    expect(error).toMatchObject({
      sourceUrl,
      diagnostics: { httpStatus: 302 },
    });
    expect(canceled).toBe(true);
  });

  test("rejects an oversized stream before decoding", async () => {
    await expect(
      runEffectResponse(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]));
              controller.close();
            },
          }),
          {
            status: 200,
            headers: { "content-type": "text/html; charset=UTF-8" },
          },
        ),
        { maxBytes: 4 },
      ),
    ).rejects.toMatchObject({
      _tag: "ParseFailure",
      diagnostics: {
        parseReason: "response exceeded 4 bytes before decoding",
      },
    });
  });

  test("rejects wrong media types and unknown charsets as parse failures", async () => {
    await expect(
      runEffectResponse(
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toBeInstanceOf(ParseFailure);

    await expect(
      runEffectResponse(
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=iso-8859-1" },
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "ParseFailure",
      diagnostics: { parseReason: "unsupported charset" },
    });

    for (const contentType of [
      "application/json",
      "text/html; charset=iso-8859-1",
    ]) {
      let canceled = false;
      const error = await withFetch(
        async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              cancel() {
                canceled = true;
              },
            }),
            { status: 200, headers: { "content-type": contentType } },
          ),
        () =>
          fetchDartWebTextResponse(sourceUrl, policy).then(
            () => undefined,
            (cause: unknown) => cause,
          ),
      );

      expect(error).toBeInstanceOf(ParseFailure);
      expect(canceled).toBe(true);
    }
  });

  test("rejects empty 200 bodies consistently as parse failures", async () => {
    await expect(
      runEffectResponse(
        new Response(null, {
          status: 200,
          headers: { "content-type": "text/html; charset=UTF-8" },
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "ParseFailure",
      diagnostics: { parseReason: "empty response body" },
    });

    const error = await withFetch(
      async () =>
        new Response(null, {
          status: 200,
          headers: { "content-type": "text/html; charset=UTF-8" },
        }),
      () =>
        fetchDartWebTextResponse(sourceUrl, policy).then(
          () => undefined,
          (cause: unknown) => cause,
        ),
    );

    expect(error).toMatchObject({
      _tag: "ParseFailure",
      diagnostics: { parseReason: "empty response body" },
    });
  });

  test("accepts the explicitly supported charset aliases", () => {
    expect(resolveDartCharset(undefined)).toBe("utf-8");
    expect(resolveDartCharset("text/html; charset=UTF8")).toBe("utf-8");
    expect(resolveDartCharset("text/html; charset=MS949")).toBe("euc-kr");
    expect(resolveDartCharset("text/html; charset=EUC-KR")).toBe("euc-kr");
    expect(resolveDartCharset("text/html; charset=KS_C_5601-1987")).toBe("euc-kr");
  });

  test("composes caller cancellation with an in-flight body read", async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new TextEncoder().encode("<html>partial"));
      },
    });

    const pending = withFetch(
      async () =>
        new Response(body, {
          status: 200,
          headers: { "content-type": "text/html; charset=UTF-8" },
        }),
      () => fetchDartWebTextResponse(sourceUrl, policy, controller.signal),
    );

    setTimeout(() => controller.abort(), 10);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  test("rejects malformed or non-DART URLs without rewriting or fetching them", async () => {
    expect(canonicalizeDartSourceUrl(
      "https://user:pass@dart.fss.or.kr/test.ax",
      sourceUrl,
    )).toBe(sourceUrl);

    for (const invalidUrl of [
      "https://user:pass@dart.fss.or.kr/test.ax",
      "https://evil.example/test.ax",
      "not a URL",
    ]) {
      let fetchCalled = false;
      const error = await withFetch(
        async () => {
          fetchCalled = true;
          return new Response("", { status: 500 });
        },
        () =>
          fetchDartWebTextResponse(invalidUrl, policy).then(
            () => undefined,
            (cause: unknown) => cause,
          ),
      );

      expect(fetchCalled).toBe(false);
      expect(error).toMatchObject({
        _tag: "SourceUnavailable",
        sourceUrl,
        diagnostics: {
          parseReason: "invalid or non-DART request URL rejected",
        },
      });

      await expect(
        runEffectResponse(
          new Response("<html>unused</html>", {
            status: 200,
            headers: { "content-type": "text/html; charset=UTF-8" },
          }),
          {},
          invalidUrl,
        ),
      ).rejects.toMatchObject({
        _tag: "SourceUnavailable",
        sourceUrl,
        diagnostics: {
          parseReason: "invalid or non-DART request URL rejected",
        },
      });
    }
  });

  test("keeps the reviewed operation limits explicit", () => {
    expect(dartTransportLimits).toMatchObject({
      searchCompany: 8 * 1024 * 1024,
      searchCompanyReports: 8 * 1024 * 1024,
      reportShell: 16 * 1024 * 1024,
      reportContent: 64 * 1024 * 1024,
      searchBody: 8 * 1024 * 1024,
      companyDetail: 8 * 1024 * 1024,
      companyRss: 8 * 1024 * 1024,
    });
  });
});
