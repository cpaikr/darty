import type { DartyErrorDiagnostics } from "../../error-diagnostics.ts";

export type DartSourceTextResponse = {
  readonly body: string;
  readonly sourceUrl: string;
  readonly diagnostics?: DartyErrorDiagnostics;
};

export const createDartSourceTextResponse = (
  body: string,
  sourceUrl: string,
  diagnostics?: DartyErrorDiagnostics,
): DartSourceTextResponse => ({
  body,
  sourceUrl,
  ...(diagnostics === undefined ? {} : { diagnostics }),
});

export const getSourceResponseErrorContext = (
  response: DartSourceTextResponse,
): Pick<DartSourceTextResponse, "sourceUrl" | "diagnostics"> => ({
  sourceUrl: response.sourceUrl,
  ...(response.diagnostics === undefined
    ? {}
    : { diagnostics: response.diagnostics }),
});
