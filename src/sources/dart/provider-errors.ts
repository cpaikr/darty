import {
  getErrorDiagnostics,
  mergeErrorDiagnostics,
  type DartyErrorDiagnostics,
} from "../../error-diagnostics.ts";
import { ParseFailure, SourceChanged, SourceUnavailable } from "./errors.ts";

export type DartSourceProviderErrorFields = {
  readonly code:
    | "source_unavailable"
    | "source_changed"
    | "source_parse_failure";
  readonly message: string;
  readonly retryable: boolean;
  readonly providerId: string;
  readonly sourceUrl: string;
  readonly diagnostics?: DartyErrorDiagnostics;
};

const toProviderDiagnostics = (input: {
  readonly providerId: string;
  readonly code: string;
  readonly sourceUrl: string;
  readonly error: unknown;
}): DartyErrorDiagnostics | undefined =>
  mergeErrorDiagnostics(
    {
      providerId: input.providerId,
      providerCode: input.code,
      sourceUrl: input.sourceUrl,
    },
    getErrorDiagnostics(input.error),
  );

const withDiagnostics = (
  fields: Omit<DartSourceProviderErrorFields, "diagnostics">,
  diagnostics: DartyErrorDiagnostics | undefined,
): DartSourceProviderErrorFields =>
  diagnostics === undefined ? fields : { ...fields, diagnostics };

export const toCommonDartSourceProviderError = <ProviderError>(
  error: unknown,
  providerId: string,
  createProviderError: (fields: DartSourceProviderErrorFields) => ProviderError,
): ProviderError | undefined => {
  if (error instanceof SourceUnavailable) {
    return createProviderError(
      withDiagnostics(
        {
          code: "source_unavailable",
          message: error.message,
          retryable: true,
          providerId,
          sourceUrl: error.sourceUrl,
        },
        toProviderDiagnostics({
          providerId,
          code: "source_unavailable",
          sourceUrl: error.sourceUrl,
          error,
        }),
      ),
    );
  }

  if (error instanceof SourceChanged) {
    return createProviderError(
      withDiagnostics(
        {
          code: "source_changed",
          message: error.message,
          retryable: false,
          providerId,
          sourceUrl: error.sourceUrl,
        },
        toProviderDiagnostics({
          providerId,
          code: "source_changed",
          sourceUrl: error.sourceUrl,
          error,
        }),
      ),
    );
  }

  if (error instanceof ParseFailure) {
    return createProviderError(
      withDiagnostics(
        {
          code: "source_parse_failure",
          message: error.message,
          retryable: false,
          providerId,
          sourceUrl: error.sourceUrl,
        },
        toProviderDiagnostics({
          providerId,
          code: "source_parse_failure",
          sourceUrl: error.sourceUrl,
          error,
        }),
      ),
    );
  }

  return undefined;
};
