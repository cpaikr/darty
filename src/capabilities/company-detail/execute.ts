import {
  getProviderFailureDiagnostics,
  toCommonSourceFailure,
} from "../provider-errors.ts";
import {
  getCompanyNotFoundRecoveryHint,
  getExecutionFailureRecoveryHint,
  getInvalidRequestRecoveryHint,
} from "../recovery-hints.ts";
import { companyDetailFailureCopy } from "./copy.ts";
import {
  CompanyDetailFailure,
  InvalidCompanyDetailRequest,
  resolveCompanyDetailRequest,
  type CompanyDetailRawInput,
  type CompanyDetailResult,
} from "./contract.ts";
import {
  buildCompanyDetailResult,
  CompanyDetailProviderError,
  type CompanyDetailProvider,
} from "./provider.ts";

const toCompanyDetailFailure = (error: unknown): CompanyDetailFailure => {
  if (error instanceof InvalidCompanyDetailRequest) {
    return new CompanyDetailFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
      recoveryHint: getInvalidRequestRecoveryHint(error),
    });
  }

  if (error instanceof CompanyDetailProviderError) {
    if (error.code === "not_found") {
      const diagnostics = getProviderFailureDiagnostics(error);

      return new CompanyDetailFailure({
        code: "not_found",
        message: error.message,
        retryable: false,
        sourceUrl: error.sourceUrl,
        recoveryHint: getCompanyNotFoundRecoveryHint(),
        ...(diagnostics === undefined ? {} : { diagnostics }),
      });
    }

    const sourceFailure = toCommonSourceFailure(
      error,
      (fields) => new CompanyDetailFailure(fields),
    );

    if (sourceFailure !== undefined) {
      return sourceFailure;
    }

    const diagnostics = getProviderFailureDiagnostics(error);

    return new CompanyDetailFailure({
      code: "internal_error",
      message: companyDetailFailureCopy.unexpectedCompanyDetail,
      retryable: error.retryable,
      recoveryHint: getExecutionFailureRecoveryHint(error.code, error.retryable),
      ...(diagnostics === undefined ? {} : { diagnostics }),
    });
  }

  return new CompanyDetailFailure({
    code: "internal_error",
    message: companyDetailFailureCopy.unexpectedCompanyDetail,
    retryable: false,
    recoveryHint: getExecutionFailureRecoveryHint("internal_error", false),
  });
};

export const executeCompanyDetail = async (
  input: Partial<CompanyDetailRawInput> & Record<string, unknown>,
  provider: CompanyDetailProvider,
): Promise<CompanyDetailResult> => {
  try {
    const request = resolveCompanyDetailRequest(input);
    const providerResult = await provider.detail(request);

    return buildCompanyDetailResult(request, providerResult);
  } catch (error) {
    throw toCompanyDetailFailure(error);
  }
};
