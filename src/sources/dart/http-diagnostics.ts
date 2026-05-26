import type { HttpClientResponse } from "@effect/platform/HttpClientResponse";

import {
  createCauseDiagnostics,
  mergeErrorDiagnostics,
  type DartyErrorDiagnostics,
} from "../../error-diagnostics.ts";

export const toHttpResponseDiagnostics = (
  response: Pick<HttpClientResponse, "headers" | "status">,
  responseText?: string,
): DartyErrorDiagnostics => ({
  httpStatus: response.status,
  ...(response.headers["content-type"] === undefined
    ? {}
    : { httpContentType: response.headers["content-type"] }),
  ...(responseText === undefined
    ? {}
    : { httpResponseLength: responseText.length }),
});

export const toHttpFailureDiagnostics = (
  cause: unknown,
): DartyErrorDiagnostics | undefined => createCauseDiagnostics(cause);

export const toTextDecodeFailureDiagnostics = (
  response: Pick<HttpClientResponse, "headers" | "status">,
  cause: unknown,
): DartyErrorDiagnostics | undefined =>
  mergeErrorDiagnostics(toHttpResponseDiagnostics(response), createCauseDiagnostics(cause));

export const toParseFailureDiagnostics = (
  input: {
    readonly reason: string;
    readonly responseText?: string;
    readonly cause?: unknown;
  },
): DartyErrorDiagnostics | undefined =>
  mergeErrorDiagnostics(
    {
      parseReason: input.reason,
      ...(input.responseText === undefined
        ? {}
        : { httpResponseLength: input.responseText.length }),
    },
    input.cause === undefined ? undefined : createCauseDiagnostics(input.cause),
  );
