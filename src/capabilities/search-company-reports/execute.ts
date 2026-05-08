import { toCommonSourceFailure } from "../provider-errors.ts";
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

    return new SearchCompanyReportsFailure({
      code: "internal_error",
      message: searchCompanyReportsFailureCopy.unexpectedSearchCompanyReports,
      retryable: error.retryable,
    });
  }

  return new SearchCompanyReportsFailure({
    code: "internal_error",
    message: searchCompanyReportsFailureCopy.unexpectedSearchCompanyReports,
    retryable: false,
  });
};

export const executeSearchCompanyReports = async (
  input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
  provider: SearchCompanyReportsProvider,
): Promise<SearchCompanyReportsResult> => {
  try {
    const request = resolveSearchCompanyReportsRequest(input);
    const providerResult = await provider.search(request);

    return buildSearchCompanyReportsResult(request, providerResult);
  } catch (error) {
    throw toSearchCompanyReportsFailure(error);
  }
};
