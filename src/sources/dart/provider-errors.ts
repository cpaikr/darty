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
};

export const toCommonDartSourceProviderError = <ProviderError>(
  error: unknown,
  providerId: string,
  createProviderError: (fields: DartSourceProviderErrorFields) => ProviderError,
): ProviderError | undefined => {
  if (error instanceof SourceUnavailable) {
    return createProviderError({
      code: "source_unavailable",
      message: error.message,
      retryable: true,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  if (error instanceof SourceChanged) {
    return createProviderError({
      code: "source_changed",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  if (error instanceof ParseFailure) {
    return createProviderError({
      code: "source_parse_failure",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  return undefined;
};
