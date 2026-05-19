import {
  assertNoUnknownKeys,
  assertObjectInput,
  normalizeTextFilterFields,
} from "../../request-validation.ts";
import { disclosureTypesValidationCopy } from "../copy.ts";
import { disclosureTypeCategoryValues } from "../data.ts";
import { InvalidDisclosureTypesRequest } from "./errors.ts";
import {
  disclosureTypesFieldSpecs,
  type DisclosureTypesRawInput,
  type DisclosureTypesRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(disclosureTypesFieldSpecs));
const categorySet = new Set<string>(disclosureTypeCategoryValues);

export const resolveDisclosureTypesRequest = (
  input: Partial<DisclosureTypesRawInput> & Record<string, unknown>,
): DisclosureTypesRequest => {
  assertObjectInput(
    input,
    (actual) =>
      new InvalidDisclosureTypesRequest({
        code: "invalid_parameter",
        parameter: "input",
        reason: "invalid_type",
        expected: disclosureTypesValidationCopy.inputExpected,
        actual,
        message: disclosureTypesValidationCopy.inputMustBeObject,
      }),
  );

  assertNoUnknownKeys(
    input,
    allowedKeys,
    (key, actual) =>
      new InvalidDisclosureTypesRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual,
        message: disclosureTypesValidationCopy.unknownParameter(key),
      }),
  );

  const normalizedInput = normalizeTextFilterFields(input, ["query", "category"]);
  const request: Record<string, string> = {};

  if (normalizedInput.category !== undefined) {
    if (typeof normalizedInput.category !== "string") {
      throw new InvalidDisclosureTypesRequest({
        code: "invalid_parameter",
        parameter: "category",
        reason: "invalid_type",
        expected: disclosureTypesValidationCopy.expectedCategory,
        actual: normalizedInput.category,
        message: disclosureTypesValidationCopy.mustBeString("category"),
      });
    }

    const category = normalizedInput.category.toUpperCase();
    if (!categorySet.has(category)) {
      throw new InvalidDisclosureTypesRequest({
        code: "invalid_parameter",
        parameter: "category",
        reason: "invalid_choice",
        expected: disclosureTypesValidationCopy.expectedCategory,
        actual: normalizedInput.category,
        message: disclosureTypesValidationCopy.mustUseCategory("category"),
      });
    }

    request.category = category;
  }

  if (normalizedInput.query !== undefined) {
    if (typeof normalizedInput.query !== "string") {
      throw new InvalidDisclosureTypesRequest({
        code: "invalid_parameter",
        parameter: "query",
        reason: "invalid_type",
        expected: disclosureTypesValidationCopy.expectedNonEmptyString,
        actual: normalizedInput.query,
        message: disclosureTypesValidationCopy.mustBeString("query"),
      });
    }

    if (normalizedInput.query.length === 0) {
      throw new InvalidDisclosureTypesRequest({
        code: "invalid_parameter",
        parameter: "query",
        reason: "empty_string",
        expected: disclosureTypesValidationCopy.expectedNonEmptyString,
        actual: normalizedInput.query,
        message: disclosureTypesValidationCopy.mustNotBeEmpty("query"),
      });
    }

    request.query = normalizedInput.query;
  }

  return request as DisclosureTypesRequest;
};
