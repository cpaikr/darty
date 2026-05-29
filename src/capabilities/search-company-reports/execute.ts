import {
  getProviderFailureDiagnostics,
  toCommonSourceFailure,
} from "../provider-errors.ts";
import {
  getExecutionFailureRecoveryHint,
  getInvalidRequestRecoveryHint,
} from "../recovery-hints.ts";
import type { DartyExecutionContext } from "../types.ts";
import { searchCompanyReportsFailureCopy } from "./copy.ts";
import {
  InvalidSearchCompanyReportsRequest,
  SearchCompanyReportsFailure,
  resolveSearchCompanyReportsRequest,
  type SearchCompanyReportsRawInput,
  type SearchCompanyReportsResult,
} from "./contract.ts";
import {
  buildSearchCompanyReportsResult,
  SearchCompanyReportsProviderError,
  type SearchCompanyReportsProvider,
} from "./provider.ts";

const toSearchCompanyReportsFailure = (
  error: unknown,
): SearchCompanyReportsFailure => {
  if (error instanceof InvalidSearchCompanyReportsRequest) {
    return new SearchCompanyReportsFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
      recoveryHint: getInvalidRequestRecoveryHint(error),
    });
  }

  if (error instanceof SearchCompanyReportsProviderError) {
    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new SearchCompanyReportsFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
    }

    const diagnostics = getProviderFailureDiagnostics(error);

    return new SearchCompanyReportsFailure({
      code: "internal_error",
      message: searchCompanyReportsFailureCopy.unexpectedSearchCompanyReports,
      retryable: error.retryable,
      recoveryHint: getExecutionFailureRecoveryHint(error.code, error.retryable),
      ...(diagnostics === undefined ? {} : { diagnostics }),
    });
  }

  return new SearchCompanyReportsFailure({
    code: "internal_error",
    message: searchCompanyReportsFailureCopy.unexpectedSearchCompanyReports,
    retryable: false,
    recoveryHint: getExecutionFailureRecoveryHint("internal_error", false),
  });
};

export const executeSearchCompanyReports = async (
  input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
  provider: SearchCompanyReportsProvider,
  context?: DartyExecutionContext,
): Promise<SearchCompanyReportsResult> => {
  try {
    const request = resolveSearchCompanyReportsRequest(input);
    const providerResult = await provider.search(request, context);

    return buildSearchCompanyReportsResult(request, providerResult);
  } catch (error) {
    throw toSearchCompanyReportsFailure(error);
  }
};
