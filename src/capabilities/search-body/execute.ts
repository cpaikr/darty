import { searchBodyFailureCopy } from "./copy.ts";
import {
  SearchBodyFailure,
  InvalidSearchBodyRequest,
  resolveSearchBodyRequest,
  type SearchBodyRawInput,
  type SearchBodyResult,
} from "./contract.ts";
import {
  buildSearchBodyResult,
  SearchBodyProviderError,
  type SearchBodyProvider,
} from "./provider.ts";

const toSearchBodyFailure = (error: unknown): SearchBodyFailure => {
  if (error instanceof InvalidSearchBodyRequest) {
    return new SearchBodyFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
    });
  }

  if (error instanceof SearchBodyProviderError) {
    if (error.code === "source_unavailable") {
      return new SearchBodyFailure({
        code: "source_unavailable",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_changed") {
      return new SearchBodyFailure({
        code: "source_changed",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_parse_failure") {
      return new SearchBodyFailure({
        code: "source_parse_failure",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    return new SearchBodyFailure({
      code: "internal_error",
      message: searchBodyFailureCopy.unexpectedSearchBody,
      retryable: error.retryable,
    });
  }

  return new SearchBodyFailure({
    code: "internal_error",
    message: searchBodyFailureCopy.unexpectedSearchBody,
    retryable: false,
  });
};

export const executeSearchBody = async (
  input: Partial<SearchBodyRawInput> & Record<string, unknown>,
  provider: SearchBodyProvider,
): Promise<SearchBodyResult> => {
  try {
    const request = resolveSearchBodyRequest(input);
    const providerResult = await provider.search(request);

    return buildSearchBodyResult(request, providerResult);
  } catch (error) {
    throw toSearchBodyFailure(error);
  }
};

