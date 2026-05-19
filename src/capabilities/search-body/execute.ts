import { toCommonSourceFailure } from "../provider-errors.ts";
import { getInvalidRequestRecoveryHint } from "../recovery-hints.ts";
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
      recoveryHint: getInvalidRequestRecoveryHint(error),
    });
  }

  if (error instanceof SearchBodyProviderError) {
    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new SearchBodyFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
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

