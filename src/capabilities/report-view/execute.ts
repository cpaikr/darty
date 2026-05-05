import { reportViewFailureCopy } from "./copy.ts";
import {
  InvalidReportViewRequest,
  ReportViewFailure,
  resolveReportViewRequest,
  type ReportViewRawInput,
  type ReportViewResult,
} from "./contract.ts";
import {
  buildReportViewResult,
  ReportViewProviderError,
  type ReportViewProvider,
} from "./provider.ts";

const toReportViewFailure = (error: unknown): ReportViewFailure => {
  if (error instanceof InvalidReportViewRequest) {
    return new ReportViewFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
    });
  }

  if (error instanceof ReportViewProviderError) {
    if (error.code === "not_found") {
      return new ReportViewFailure({
        code: "not_found",
        message: error.message,
        retryable: false,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_unavailable") {
      return new ReportViewFailure({
        code: "source_unavailable",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_changed") {
      return new ReportViewFailure({
        code: "source_changed",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    if (error.code === "source_parse_failure") {
      return new ReportViewFailure({
        code: "source_parse_failure",
        message: error.message,
        retryable: error.retryable,
        sourceUrl: error.sourceUrl,
      });
    }

    return new ReportViewFailure({
      code: "internal_error",
      message: reportViewFailureCopy.unexpectedReportView,
      retryable: error.retryable,
    });
  }

  return new ReportViewFailure({
    code: "internal_error",
    message: reportViewFailureCopy.unexpectedReportView,
    retryable: false,
  });
};

export const executeReportView = async (
  input: Partial<ReportViewRawInput> & Record<string, unknown>,
  provider: ReportViewProvider,
): Promise<ReportViewResult> => {
  try {
    const request = resolveReportViewRequest(input);
    const providerResult = await provider.view(request);

    return buildReportViewResult(request, providerResult);
  } catch (error) {
    throw toReportViewFailure(error);
  }
};
