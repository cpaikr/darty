import { type ParseResult } from "effect";

import {
  assertNoUnknownKeys,
  assertObjectInput,
  assertYYYYMMDDDateRange,
  getFirstParameterIssues,
  normalizeTextFilterFields,
} from "../../request-validation.ts";
import { searchBodyValidationCopy } from "../copy.ts";
import { InvalidSearchBodyRequest } from "./errors.ts";
import {
  searchBodyFieldSpecs,
  decodeSearchBodyRequest,
  type SearchBodyFieldSpec,
  type SearchBodyInputKey,
  type SearchBodyRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(searchBodyFieldSpecs));
const orderedInputKeys = Object.keys(
  searchBodyFieldSpecs,
) as readonly SearchBodyInputKey[];

const validateResolvedRequest = (request: SearchBodyRequest): void => {
  assertYYYYMMDDDateRange(request, {
    makeInvalidStartDateError: (value) =>
      new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter: "startDate",
        reason: "invalid_calendar_date",
        expected: "date_YYYYMMDD",
        actual: value,
        message: searchBodyValidationCopy.mustBeRealDate("startDate", value),
      }),
    makeInvalidEndDateError: (value) =>
      new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter: "endDate",
        reason: "invalid_calendar_date",
        expected: "date_YYYYMMDD",
        actual: value,
        message: searchBodyValidationCopy.mustBeRealDate("endDate", value),
      }),
    makeReversedRangeError: ({ startDate, endDate }) =>
      new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter: "startDate",
        reason: "start_date_after_end_date",
        expected: "date_range_start_lte_end",
        actual: { startDate, endDate },
        message: searchBodyValidationCopy.startDateMustNotBeAfterEndDate(
          startDate,
          endDate,
        ),
      }),
  });
};

const getExpectedToken = (rule: SearchBodyFieldSpec): string => {
  switch (rule.kind) {
    case "integer":
      return `integer_between_${rule.minimum}_and_${rule.maximum}`;
    case "enum":
      return `one_of:${rule.enumValues.join(",")}`;
    case "string":
      return "non_empty_string";
    case "patternString":
      return rule.expectedToken;
    case "date":
      return "date_YYYYMMDD";
  }
};

const getExpectedDescription = (rule: SearchBodyFieldSpec): string => {
  switch (rule.kind) {
    case "integer":
      return searchBodyValidationCopy.expectedIntegerBetween(
        rule.minimum,
        rule.maximum,
      );
    case "enum":
      return searchBodyValidationCopy.expectedOneOf(rule.enumValues);
    case "string":
      return searchBodyValidationCopy.expectedNonEmptyString;
    case "patternString":
      return rule.description;
    case "date":
      return searchBodyValidationCopy.expectedDateYYYYMMDD;
  }
};

const toInvalidSearchBodyRequest = (
  input: Record<string, unknown>,
  error: ParseResult.ParseError,
): InvalidSearchBodyRequest => {
  const { parameter, issues } = getFirstParameterIssues(error, orderedInputKeys);

  if (parameter === undefined) {
    return new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: searchBodyValidationCopy.inputExpected,
      actual: input,
      message: searchBodyValidationCopy.inputMustBeObject,
    });
  }

  const rule = searchBodyFieldSpecs[parameter];
  const actual = input[parameter];

  if (issues.some((issue) => issue._tag === "Missing")) {
    return new InvalidSearchBodyRequest({
      code: "missing_parameter",
      parameter,
      reason: "required",
      expected: getExpectedToken(rule),
      message: searchBodyValidationCopy.missingRequired(
        parameter,
        getExpectedDescription(rule),
      ),
    });
  }

  if (rule.kind === "enum") {
    const choices = [...rule.enumValues];

    if (typeof actual !== "string") {
      return new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: "string",
        actual,
        message: searchBodyValidationCopy.mustBeString(parameter),
      });
    }

    return new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_choice",
      expected: getExpectedToken(rule),
      actual,
      message: searchBodyValidationCopy.mustBeOneOf(parameter, choices),
    });
  }

  if (rule.kind === "integer") {
    if (!Number.isInteger(actual)) {
      return new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: "integer",
        actual,
        message: searchBodyValidationCopy.mustBeInteger(parameter),
      });
    }

    const numericActual = actual as number;

    if (numericActual < rule.minimum || numericActual > rule.maximum) {
      return new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter,
        reason: "out_of_range",
        expected: getExpectedToken(rule),
        actual: numericActual,
        message: searchBodyValidationCopy.mustBeInRange(
          parameter,
          rule.minimum,
          rule.maximum,
        ),
      });
    }
  }

  if (typeof actual !== "string") {
    return new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_type",
      expected: "string",
      actual,
      message: searchBodyValidationCopy.mustBeString(parameter),
    });
  }

  if (rule.kind === "string" && rule.nonEmpty && actual.length === 0) {
    return new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter,
      reason: "empty_string",
      expected: getExpectedToken(rule),
      actual,
      message: searchBodyValidationCopy.mustNotBeEmpty(parameter),
    });
  }

  if (rule.kind === "date" || rule.kind === "patternString") {
    return new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_format",
      expected: getExpectedToken(rule),
      actual,
      message:
        rule.kind === "date"
          ? searchBodyValidationCopy.mustUseDateFormat(parameter)
          : searchBodyValidationCopy.mustUseDartCompanyCode(parameter),
    });
  }

  return new InvalidSearchBodyRequest({
    code: "invalid_parameter",
    parameter,
    reason: "invalid_parameter",
    actual,
    message: searchBodyValidationCopy.invalidParameter(parameter),
  });
};

export const resolveSearchBodyRequest = (
  input: unknown,
): SearchBodyRequest => {
  assertObjectInput(
    input,
    (actual) =>
      new InvalidSearchBodyRequest({
        code: "invalid_parameter",
        parameter: "input",
        reason: "invalid_type",
        expected: searchBodyValidationCopy.inputExpected,
        actual,
        message: searchBodyValidationCopy.inputMustBeObject,
      }),
  );

  assertNoUnknownKeys(
    input,
    allowedKeys,
    (key, actual) =>
      new InvalidSearchBodyRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual,
        message: searchBodyValidationCopy.unknownParameter(key),
      }),
  );

  const normalizedInput = normalizeTextFilterFields(input, [
    "presenterName",
    "reportName",
  ]);
  const result = decodeSearchBodyRequest(normalizedInput);

  if (result._tag === "Right") {
    validateResolvedRequest(result.right);
    return result.right;
  }

  throw toInvalidSearchBodyRequest(normalizedInput, result.left);
};
