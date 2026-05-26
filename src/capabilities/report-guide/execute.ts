import { getExecutionFailureRecoveryHint } from "../recovery-hints.ts";
import { reportGuideFailureCopy } from "./copy.ts";
import {
  InvalidReportGuideRequest,
  ReportGuideFailure,
  resolveReportGuideRequest,
  type ReportGuideRawInput,
  type ReportGuideResult,
} from "./contract.ts";
import {
  reportGuideMarkdown,
  reportGuideSourcePath,
  reportGuideSourceUrls,
  reportGuideTitle,
} from "./content.ts";

const buildReportGuideResult = (): ReportGuideResult => ({
  result: {
    request: {},
    title: reportGuideTitle,
    contentMarkdown: reportGuideMarkdown,
  },
  metadata: {
    source: {
      status: "bundled_project_document",
      path: reportGuideSourcePath,
    },
  },
  references: {
    guidePath: reportGuideSourcePath,
    sourceUrls: [...reportGuideSourceUrls],
  },
  warnings: [],
});

const toReportGuideFailure = (error: unknown): ReportGuideFailure => {
  if (error instanceof InvalidReportGuideRequest) {
    return new ReportGuideFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
    });
  }

  const recoveryHint = getExecutionFailureRecoveryHint("internal_error", false);

  return new ReportGuideFailure({
    code: "internal_error",
    message: reportGuideFailureCopy.unexpectedReportGuide,
    retryable: false,
    ...(recoveryHint === undefined ? {} : { recoveryHint }),
  });
};

export const executeReportGuide = async (
  input: Partial<ReportGuideRawInput> & Record<string, unknown>,
): Promise<ReportGuideResult> => {
  try {
    resolveReportGuideRequest(input);

    return buildReportGuideResult();
  } catch (error) {
    throw toReportGuideFailure(error);
  }
};
