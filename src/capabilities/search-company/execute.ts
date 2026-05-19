import { toCommonSourceFailure } from "../provider-errors.ts";
import { getInvalidRequestRecoveryHint } from "../recovery-hints.ts";
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

    return new SearchCompanyFailure({
      code: "internal_error",
      message: searchCompanyFailureCopy.unexpectedSearchCompany,
      retryable: error.retryable,
    });
  }

  return new SearchCompanyFailure({
    code: "internal_error",
    message: searchCompanyFailureCopy.unexpectedSearchCompany,
    retryable: false,
  });
};

export const executeSearchCompany = async (
  input: Partial<SearchCompanyRawInput> & Record<string, unknown>,
  provider: SearchCompanyProvider,
): Promise<SearchCompanyResult> => {
  try {
    const request = resolveSearchCompanyRequest(input);
    const providerResult = await provider.search(request);

    return buildSearchCompanyResult(request, providerResult);
  } catch (error) {
    throw toSearchCompanyFailure(error);
  }
};
