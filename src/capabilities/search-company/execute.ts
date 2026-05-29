import {
  getProviderFailureDiagnostics,
  toCommonSourceFailure,
} from "../provider-errors.ts";
import {
  getExecutionFailureRecoveryHint,
  getInvalidRequestRecoveryHint,
} from "../recovery-hints.ts";
import type { DartyExecutionContext } from "../types.ts";
import { searchCompanyFailureCopy } from "./copy.ts";
import {
  InvalidSearchCompanyRequest,
  SearchCompanyFailure,
  resolveSearchCompanyRequest,
  type SearchCompanyRawInput,
  type SearchCompanyResult,
} from "./contract.ts";
import {
  buildSearchCompanyResult,
  SearchCompanyProviderError,
  type SearchCompanyProvider,
} from "./provider.ts";

const toSearchCompanyFailure = (error: unknown): SearchCompanyFailure => {
  if (error instanceof InvalidSearchCompanyRequest) {
    return new SearchCompanyFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
      recoveryHint: getInvalidRequestRecoveryHint(error),
    });
  }

  if (error instanceof SearchCompanyProviderError) {
    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new SearchCompanyFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
    }

    const diagnostics = getProviderFailureDiagnostics(error);

    return new SearchCompanyFailure({
      code: "internal_error",
      message: searchCompanyFailureCopy.unexpectedSearchCompany,
      retryable: error.retryable,
      recoveryHint: getExecutionFailureRecoveryHint(error.code, error.retryable),
      ...(diagnostics === undefined ? {} : { diagnostics }),
    });
  }

  return new SearchCompanyFailure({
    code: "internal_error",
    message: searchCompanyFailureCopy.unexpectedSearchCompany,
    retryable: false,
    recoveryHint: getExecutionFailureRecoveryHint("internal_error", false),
  });
};

export const executeSearchCompany = async (
  input: Partial<SearchCompanyRawInput> & Record<string, unknown>,
  provider: SearchCompanyProvider,
  context?: DartyExecutionContext,
): Promise<SearchCompanyResult> => {
  try {
    const request = resolveSearchCompanyRequest(input);
    const providerResult = await provider.search(request, context);

    return buildSearchCompanyResult(request, providerResult);
  } catch (error) {
    throw toSearchCompanyFailure(error);
  }
};
