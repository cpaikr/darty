import {
  getProviderFailureDiagnostics,
  toCommonSourceFailure,
} from "../provider-errors.ts";
import {
  getExecutionFailureRecoveryHint,
  getInvalidRequestRecoveryHint,
} from "../recovery-hints.ts";
import { companyRssFailureCopy } from "./copy.ts";
import {
  CompanyRssFailure,
  InvalidCompanyRssRequest,
  resolveCompanyRssRequest,
  type CompanyRssRawInput,
  type CompanyRssResult,
} from "./contract.ts";
import {
  buildCompanyRssResult,
  CompanyRssProviderError,
  type CompanyRssProvider,
} from "./provider.ts";

const toCompanyRssFailure = (error: unknown): CompanyRssFailure => {
  if (error instanceof InvalidCompanyRssRequest) {
    return new CompanyRssFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
      recoveryHint: getInvalidRequestRecoveryHint(error),
    });
  }

  if (error instanceof CompanyRssProviderError) {
    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new CompanyRssFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
    }

    const diagnostics = getProviderFailureDiagnostics(error);

    return new CompanyRssFailure({
      code: "internal_error",
      message: companyRssFailureCopy.unexpectedCompanyRss,
      retryable: error.retryable,
      recoveryHint: getExecutionFailureRecoveryHint(error.code, error.retryable),
      ...(diagnostics === undefined ? {} : { diagnostics }),
    });
  }

  return new CompanyRssFailure({
    code: "internal_error",
    message: companyRssFailureCopy.unexpectedCompanyRss,
    retryable: false,
    recoveryHint: getExecutionFailureRecoveryHint("internal_error", false),
  });
};

export const executeCompanyRss = async (
  input: Partial<CompanyRssRawInput> & Record<string, unknown>,
  provider: CompanyRssProvider,
): Promise<CompanyRssResult> => {
  try {
    const request = resolveCompanyRssRequest(input);
    const providerResult = await provider.rss(request);

    return buildCompanyRssResult(request, providerResult);
  } catch (error) {
    throw toCompanyRssFailure(error);
  }
};
