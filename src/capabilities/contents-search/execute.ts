import { contentsSearchFailureCopy } from "./copy/failure.ts";
import {
  ContentsSearchFailure,
  InvalidContentsSearchRequest,
  resolveContentsSearchRequest,
  type ContentsSearchRawInput,
  type ContentsSearchResult,
} from "./contract.ts";
import {
  buildContentsSearchResult,
  ContentsSearchProviderError,
  type ContentsSearchProvider,
} from "./provider.ts";

const toContentsSearchFailure = (error: unknown): ContentsSearchFailure => {
  if (error instanceof InvalidContentsSearchRequest) {
    return new ContentsSearchFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
    });
  }

  if (error instanceof ContentsSearchProviderError) {
    if (error.code === "source_unavailable") {
      return new ContentsSearchFailure({
        code: "source_unavailable",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_changed") {
      return new ContentsSearchFailure({
        code: "source_changed",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_parse_failure") {
      return new ContentsSearchFailure({
        code: "source_parse_failure",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    return new ContentsSearchFailure({
      code: "internal_error",
      message: contentsSearchFailureCopy.unexpectedContentsSearch,
      retryable: error.retryable,
    });
  }

  return new ContentsSearchFailure({
    code: "internal_error",
    message: contentsSearchFailureCopy.unexpectedContentsSearch,
    retryable: false,
  });
};

export const executeContentsSearch = async (
  input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  provider: ContentsSearchProvider,
): Promise<ContentsSearchResult> => {
  try {
    const request = resolveContentsSearchRequest(input);
    const providerResult = await provider.search(request);

    return buildContentsSearchResult(request, providerResult);
  } catch (error) {
    throw toContentsSearchFailure(error);
  }
};

