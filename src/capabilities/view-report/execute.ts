import { toCommonSourceFailure } from "../provider-errors.ts";
import { viewReportFailureCopy } from "./copy.ts";
import {
  InvalidViewReportRequest,
  ViewReportFailure,
  resolveViewReportRequest,
  type ViewReportRawInput,
  type ViewReportResult,
} from "./contract.ts";
import {
  buildViewReportResult,
  ViewReportProviderError,
  type ViewReportProvider,
} from "./provider.ts";

const toViewReportFailure = (error: unknown): ViewReportFailure => {
  if (error instanceof InvalidViewReportRequest) {
    return new ViewReportFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
    });
  }

  if (error instanceof ViewReportProviderError) {
    if (error.code === "not_found") {
      return new ViewReportFailure({
        code: "not_found",
        message: error.message,
        retryable: false,
        parameter: error.parameter,
        sourceUrl: error.sourceUrl,
      });
    }

    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new ViewReportFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
    }

    return new ViewReportFailure({
      code: "internal_error",
      message: viewReportFailureCopy.unexpectedViewReport,
      retryable: error.retryable,
    });
  }

  return new ViewReportFailure({
    code: "internal_error",
    message: viewReportFailureCopy.unexpectedViewReport,
    retryable: false,
  });
};

export const executeViewReport = async (
  input: Partial<ViewReportRawInput> & Record<string, unknown>,
  provider: ViewReportProvider,
): Promise<ViewReportResult> => {
  try {
    const request = resolveViewReportRequest(input);
    const providerResult = await provider.view(request);

    return buildViewReportResult(request, providerResult);
  } catch (error) {
    throw toViewReportFailure(error);
  }
};
