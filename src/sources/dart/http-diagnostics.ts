import type { HttpClientResponse } from "@effect/platform/HttpClientResponse";

import {
  createCauseDiagnostics,
  mergeErrorDiagnostics,
  type DartyErrorDiagnostics,
} from "../../error-diagnostics.ts";
import type { DartSourceTextResponse } from "./source-response.ts";

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

export const toWebResponseDiagnostics = (
  response: Pick<Response, "headers" | "status">,
  responseText?: string,
): DartyErrorDiagnostics => {
  const contentType = response.headers.get("content-type");

  return {
    httpStatus: response.status,
    ...(contentType === null ? {} : { httpContentType: contentType }),
    ...(responseText === undefined
      ? {}
      : { httpResponseLength: responseText.length }),
  };
};

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
    readonly response: DartSourceTextResponse;
    readonly cause?: unknown;
  },
): DartyErrorDiagnostics | undefined =>
  mergeErrorDiagnostics(
    {
      parseReason: input.reason,
      httpResponseLength: input.response.body.length,
    },
    input.response.diagnostics,
    input.cause === undefined ? undefined : createCauseDiagnostics(input.cause),
  );
