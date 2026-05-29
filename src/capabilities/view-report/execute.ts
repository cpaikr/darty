import {
  getProviderFailureDiagnostics,
  toCommonSourceFailure,
} from "../provider-errors.ts";
import {
  getExecutionFailureRecoveryHint,
  getInvalidRequestRecoveryHint,
  getViewReportNotFoundRecoveryHint,
} from "../recovery-hints.ts";
import type { DartyExecutionContext } from "../types.ts";
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
      recoveryHint: getInvalidRequestRecoveryHint(error),
    });
  }

  if (error instanceof ViewReportProviderError) {
    if (error.code === "not_found") {
      const diagnostics = getProviderFailureDiagnostics(error);

      return new ViewReportFailure({
        code: "not_found",
        message: error.message,
        retryable: false,
        parameter: error.parameter,
        sourceUrl: error.sourceUrl,
        recoveryHint: getViewReportNotFoundRecoveryHint(error.parameter),
        ...(diagnostics === undefined ? {} : { diagnostics }),
      });
    }

    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new ViewReportFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
    }

    const diagnostics = getProviderFailureDiagnostics(error);

    return new ViewReportFailure({
      code: "internal_error",
      message: viewReportFailureCopy.unexpectedViewReport,
      retryable: error.retryable,
      recoveryHint: getExecutionFailureRecoveryHint(error.code, error.retryable),
      ...(diagnostics === undefined ? {} : { diagnostics }),
    });
  }

  return new ViewReportFailure({
    code: "internal_error",
    message: viewReportFailureCopy.unexpectedViewReport,
    retryable: false,
    recoveryHint: getExecutionFailureRecoveryHint("internal_error", false),
  });
};

export const executeViewReport = async (
  input: Partial<ViewReportRawInput> & Record<string, unknown>,
  provider: ViewReportProvider,
  context?: DartyExecutionContext,
): Promise<ViewReportResult> => {
  try {
    const request = resolveViewReportRequest(input);
    const providerResult = await provider.view(request, context);

    return buildViewReportResult(request, providerResult);
  } catch (error) {
    throw toViewReportFailure(error);
  }
};
