import { assertObjectInput } from "../../request-validation.ts";
import { searchCompanyValidationCopy } from "../copy.ts";
import { InvalidSearchCompanyRequest } from "./errors.ts";
import {
  searchCompanyFieldSpecs,
  type SearchCompanyRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(searchCompanyFieldSpecs));

const validateIntegerField = (
  input: Record<string, unknown>,
  parameter: "page" | "pageSize",
): number => {
  const spec = searchCompanyFieldSpecs[parameter];
  const value = input[parameter] ?? spec.defaultValue;

  if (!Number.isInteger(value)) {
    throw new InvalidSearchCompanyRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_type",
      expected: "integer",
      actual: value,
      message: searchCompanyValidationCopy.mustBeInteger(parameter),
    });
  }

  const numericValue = value as number;
  if (numericValue < spec.minimum || numericValue > spec.maximum) {
    throw new InvalidSearchCompanyRequest({
      code: "invalid_parameter",
      parameter,
      reason: "out_of_range",
      expected: `integer_between_${spec.minimum}_and_${spec.maximum}`,
      actual: numericValue,
      message: searchCompanyValidationCopy.mustBeInRange(
        parameter,
        spec.minimum,
        spec.maximum,
      ),
    });
  }

  return numericValue;
};

export const resolveSearchCompanyRequest = (
  input: unknown,
): SearchCompanyRequest => {
  assertObjectInput(
    input,
    (actual) =>
      new InvalidSearchCompanyRequest({
        code: "invalid_parameter",
        parameter: "input",
        reason: "invalid_type",
        expected: searchCompanyValidationCopy.inputExpected,
        actual,
        message: searchCompanyValidationCopy.inputMustBeObject,
      }),
  );

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidSearchCompanyRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: searchCompanyValidationCopy.unknownParameter(key),
      });
    }
  }

  const companyName = input.companyName;
  if (companyName === undefined) {
    throw new InvalidSearchCompanyRequest({
      code: "missing_parameter",
      parameter: "companyName",
      reason: "required",
      expected: "string_min_length_2",
      message: searchCompanyValidationCopy.missingRequired(
        "companyName",
        searchCompanyValidationCopy.expectedNonEmptyString,
      ),
    });
  }

  if (typeof companyName !== "string") {
    throw new InvalidSearchCompanyRequest({
      code: "invalid_parameter",
      parameter: "companyName",
      reason: "invalid_type",
      expected: "string",
      actual: companyName,
      message: searchCompanyValidationCopy.mustBeString("companyName"),
    });
  }

  const trimmedCompanyName = companyName.trim();
  if (trimmedCompanyName.length < 2) {
    throw new InvalidSearchCompanyRequest({
      code: "invalid_parameter",
      parameter: "companyName",
      reason: "too_short",
      expected: "string_min_length_2",
      actual: companyName,
      message: searchCompanyValidationCopy.mustBeAtLeastTwoChars("companyName"),
    });
  }

  return {
    page: validateIntegerField(input, "page"),
    pageSize: validateIntegerField(input, "pageSize"),
    companyName: trimmedCompanyName,
  };
};
