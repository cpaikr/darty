import {
  getErrorDiagnostics,
  mergeErrorDiagnostics,
  type DartyErrorDiagnostics,
} from "../error-diagnostics.ts";
import { getExecutionFailureRecoveryHint } from "./recovery-hints.ts";

export type CommonSourceProviderError = {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly providerId?: string | undefined;
  readonly sourceUrl?: string | undefined;
  readonly diagnostics?: DartyErrorDiagnostics | undefined;
};

export type CommonSourceFailureFields = {
  readonly code:
    | "source_unavailable"
    | "source_changed"
    | "source_parse_failure";
  readonly message: string;
  readonly retryable: boolean;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;
  readonly diagnostics?: DartyErrorDiagnostics;
};

export const getProviderFailureDiagnostics = (
  error: CommonSourceProviderError,
): DartyErrorDiagnostics | undefined =>
  mergeErrorDiagnostics(
    {
      ...(error.providerId === undefined ? {} : { providerId: error.providerId }),
      providerCode: error.code,
      ...(error.sourceUrl === undefined ? {} : { sourceUrl: error.sourceUrl }),
    },
    getErrorDiagnostics(error),
  );

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

  const diagnostics = getProviderFailureDiagnostics(error);
  const recoveryHint = getExecutionFailureRecoveryHint(error.code, error.retryable);
  const fields = {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    ...(error.sourceUrl === undefined ? {} : { sourceUrl: error.sourceUrl }),
    ...(recoveryHint === undefined ? {} : { recoveryHint }),
    ...(diagnostics === undefined ? {} : { diagnostics }),
  } satisfies CommonSourceFailureFields;

  return createFailure(fields);
};
