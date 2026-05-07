export type CommonSourceProviderError = {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly sourceUrl?: string | undefined;
};

export type CommonSourceFailureFields = {
  readonly code:
    | "source_unavailable"
    | "source_changed"
    | "source_parse_failure";
  readonly message: string;
  readonly retryable: boolean;
  readonly sourceUrl?: string;
};

export const toCommonSourceFailure = <Failure>(
  error: CommonSourceProviderError,
  createFailure: (fields: CommonSourceFailureFields) => Failure,
): Failure | undefined => {
  if (
    error.code !== "source_unavailable" &&
    error.code !== "source_changed" &&
    error.code !== "source_parse_failure"
  ) {
    return undefined;
  }

  const fields = {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
  } satisfies CommonSourceFailureFields;

  return createFailure(
    error.sourceUrl === undefined
      ? fields
      : { ...fields, sourceUrl: error.sourceUrl },
  );
};
