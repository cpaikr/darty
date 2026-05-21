import { assertObjectInput } from "../../request-validation.ts";
import { responseDetailValues, type ResponseDetail } from "../../response-detail.ts";
import { companyRssValidationCopy } from "../copy.ts";
import { InvalidCompanyRssRequest } from "./errors.ts";
import {
  companyRssFieldSpecs,
  type CompanyRssRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(companyRssFieldSpecs));
const companyCodePattern = /^\d{8}$/;

export const resolveCompanyRssRequest = (
  input: unknown,
): CompanyRssRequest => {
  assertObjectInput(
    input,
    (actual) =>
      new InvalidCompanyRssRequest({
        code: "invalid_parameter",
        parameter: "input",
        reason: "invalid_type",
        expected: companyRssValidationCopy.inputExpected,
        actual,
        message: companyRssValidationCopy.inputMustBeObject,
      }),
  );

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidCompanyRssRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: companyRssValidationCopy.unknownParameter(key),
      });
    }
  }

  const detail = input.detail ?? "concise";
  if (
    typeof detail !== "string" ||
    !responseDetailValues.includes(detail as ResponseDetail)
  ) {
    throw new InvalidCompanyRssRequest({
      code: "invalid_parameter",
      parameter: "detail",
      reason: typeof detail === "string" ? "invalid_choice" : "invalid_type",
      expected: companyRssValidationCopy.expectedDetail,
      actual: detail,
      message: companyRssValidationCopy.invalidDetail("detail"),
    });
  }

  const companyCode = input.companyCode;
  if (companyCode === undefined) {
    throw new InvalidCompanyRssRequest({
      code: "missing_parameter",
      parameter: "companyCode",
      reason: "required",
      expected: companyRssValidationCopy.expectedCompanyCode,
      message: companyRssValidationCopy.missingRequired(
        "companyCode",
        companyRssValidationCopy.expectedCompanyCode,
      ),
    });
  }

  if (typeof companyCode !== "string") {
    throw new InvalidCompanyRssRequest({
      code: "invalid_parameter",
      parameter: "companyCode",
      reason: "invalid_type",
      expected: "string",
      actual: companyCode,
      message: companyRssValidationCopy.mustBeString("companyCode"),
    });
  }

  const trimmedCompanyCode = companyCode.trim();
  if (!companyCodePattern.test(trimmedCompanyCode)) {
    throw new InvalidCompanyRssRequest({
      code: "invalid_parameter",
      parameter: "companyCode",
      reason: "invalid_format",
      expected: companyRssValidationCopy.expectedCompanyCode,
      actual: companyCode,
      message: companyRssValidationCopy.invalidCompanyCode("companyCode"),
    });
  }

  return { companyCode: trimmedCompanyCode, detail: detail as ResponseDetail };
};
