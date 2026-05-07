import { companyDetailValidationCopy } from "../copy.ts";
import { InvalidCompanyDetailRequest } from "./errors.ts";
import {
  companyDetailFieldSpecs,
  type CompanyDetailRawInput,
  type CompanyDetailRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(companyDetailFieldSpecs));
const companyCodePattern = /^\d{8}$/;

export const resolveCompanyDetailRequest = (
  input: Partial<CompanyDetailRawInput> & Record<string, unknown>,
): CompanyDetailRequest => {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidCompanyDetailRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: companyDetailValidationCopy.inputExpected,
      actual: input,
      message: companyDetailValidationCopy.inputMustBeObject,
    });
  }

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidCompanyDetailRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: companyDetailValidationCopy.unknownParameter(key),
      });
    }
  }

  const companyCode = input.companyCode;
  if (companyCode === undefined) {
    throw new InvalidCompanyDetailRequest({
      code: "missing_parameter",
      parameter: "companyCode",
      reason: "required",
      expected: companyDetailValidationCopy.expectedCompanyCode,
      message: companyDetailValidationCopy.missingRequired(
        "companyCode",
        companyDetailValidationCopy.expectedCompanyCode,
      ),
    });
  }

  if (typeof companyCode !== "string") {
    throw new InvalidCompanyDetailRequest({
      code: "invalid_parameter",
      parameter: "companyCode",
      reason: "invalid_type",
      expected: "string",
      actual: companyCode,
      message: companyDetailValidationCopy.mustBeString("companyCode"),
    });
  }

  const trimmedCompanyCode = companyCode.trim();
  if (!companyCodePattern.test(trimmedCompanyCode)) {
    throw new InvalidCompanyDetailRequest({
      code: "invalid_parameter",
      parameter: "companyCode",
      reason: "invalid_format",
      expected: companyDetailValidationCopy.expectedCompanyCode,
      actual: companyCode,
      message: companyDetailValidationCopy.invalidCompanyCode("companyCode"),
    });
  }

  return { companyCode: trimmedCompanyCode };
};
