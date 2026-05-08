import { type ParseResult } from "effect";

import {
  assertNoUnknownKeys,
  assertObjectInput,
  assertYYYYMMDDDateRange,
  getFirstParameterIssues,
} from "../../request-validation.ts";
import { searchCompanyReportsValidationCopy } from "../copy.ts";
import { InvalidSearchCompanyReportsRequest } from "./errors.ts";
import {
  decodeSearchCompanyReportsRequest,
  searchCompanyReportsFieldSpecs,
  type SearchCompanyReportsFieldSpec,
  type SearchCompanyReportsInputKey,
  type SearchCompanyReportsRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(searchCompanyReportsFieldSpecs));
const orderedInputKeys = Object.keys(
  searchCompanyReportsFieldSpecs,
) as readonly SearchCompanyReportsInputKey[];

const validateResolvedRequest = (request: SearchCompanyReportsRequest): void => {
  assertYYYYMMDDDateRange(request, {
    makeInvalidStartDateError: (value) =>
      new InvalidSearchCompanyReportsRequest({
        code: "invalid_parameter",
        parameter: "startDate",
        reason: "invalid_calendar_date",
        expected: "date_YYYYMMDD",
        actual: value,
        message: searchCompanyReportsValidationCopy.mustBeRealDate(
          "startDate",
          value,
        ),
      }),
    makeInvalidEndDateError: (value) =>
      new InvalidSearchCompanyReportsRequest({
        code: "invalid_parameter",
        parameter: "endDate",
        reason: "invalid_calendar_date",
        expected: "date_YYYYMMDD",
        actual: value,
        message: searchCompanyReportsValidationCopy.mustBeRealDate(
          "endDate",
          value,
        ),
      }),
    makeReversedRangeError: ({ startDate, endDate }) =>
      new InvalidSearchCompanyReportsRequest({
        code: "invalid_parameter",
        parameter: "startDate",
        reason: "start_date_after_end_date",
        expected: "date_range_start_lte_end",
        actual: { startDate, endDate },
        message:
          searchCompanyReportsValidationCopy.startDateMustNotBeAfterEndDate(
            startDate,
            endDate,
          ),
      }),
  });
};

const getExpectedToken = (rule: SearchCompanyReportsFieldSpec): string => {
  switch (rule.kind) {
    case "integer":
      return `integer_between_${rule.minimum}_and_${rule.maximum}`;
    case "enum":
      return `one_of:${rule.enumValues.join(",")}`;
    case "patternString":
      return rule.expectedToken;
    case "date":
      return "date_YYYYMMDD";
    case "boolean":
      return "boolean";
  }
};

const getExpectedDescription = (rule: SearchCompanyReportsFieldSpec): string => {
  switch (rule.kind) {
    case "integer":
      return searchCompanyReportsValidationCopy.expectedIntegerBetween(
        rule.minimum,
        rule.maximum,
      );
    case "enum":
      return searchCompanyReportsValidationCopy.expectedOneOf(
        rule.enumValues.map(String),
      );
    case "patternString":
      return rule.description;
    case "date":
      return searchCompanyReportsValidationCopy.expectedDateYYYYMMDD;
    case "boolean":
      return searchCompanyReportsValidationCopy.expectedBoolean;
  }
};

const toInvalidSearchCompanyReportsRequest = (
  input: Record<string, unknown>,
  error: ParseResult.ParseError,
): InvalidSearchCompanyReportsRequest => {
  const { parameter, issues } = getFirstParameterIssues(error, orderedInputKeys);

  if (parameter === undefined) {
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: searchCompanyReportsValidationCopy.inputExpected,
      actual: input,
      message: searchCompanyReportsValidationCopy.inputMustBeObject,
    });
  }

  const rule = searchCompanyReportsFieldSpecs[parameter];
  const actual = input[parameter];

  if (issues.some((issue) => issue._tag === "Missing")) {
    return new InvalidSearchCompanyReportsRequest({
      code: "missing_parameter",
      parameter,
      reason: "required",
      expected: getExpectedToken(rule),
      message: searchCompanyReportsValidationCopy.missingRequired(
        parameter,
        getExpectedDescription(rule),
      ),
    });
  }

  if (rule.kind === "integer") {
    if (!Number.isInteger(actual)) {
      return new InvalidSearchCompanyReportsRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: "integer",
        actual,
        message: searchCompanyReportsValidationCopy.mustBeInteger(parameter),
      });
    }

    const numericActual = actual as number;

    if (numericActual < rule.minimum || numericActual > rule.maximum) {
      return new InvalidSearchCompanyReportsRequest({
        code: "invalid_parameter",
        parameter,
        reason: "out_of_range",
        expected: getExpectedToken(rule),
        actual: numericActual,
        message: searchCompanyReportsValidationCopy.mustBeInRange(
          parameter,
          rule.minimum,
          rule.maximum,
        ),
      });
    }
  }

  if (rule.kind === "boolean") {
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_type",
      expected: "boolean",
      actual,
      message: searchCompanyReportsValidationCopy.mustBeBoolean(parameter),
    });
  }

  if (rule.kind === "enum") {
    const choices = rule.enumValues.map(String);
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_choice",
      expected: getExpectedToken(rule),
      actual,
      message: searchCompanyReportsValidationCopy.mustBeOneOf(parameter, choices),
    });
  }

  if (typeof actual !== "string") {
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_type",
      expected: "string",
      actual,
      message: searchCompanyReportsValidationCopy.mustBeString(parameter),
    });
  }

  if (rule.kind === "date" || rule.kind === "patternString") {
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_format",
      expected: getExpectedToken(rule),
      actual,
      message:
        rule.kind === "date"
          ? searchCompanyReportsValidationCopy.mustUseDateFormat(parameter)
          : searchCompanyReportsValidationCopy.mustUseDartCompanyCode(parameter),
    });
  }

  return new InvalidSearchCompanyReportsRequest({
    code: "invalid_parameter",
    parameter,
    reason: "invalid_parameter",
    actual,
    message: searchCompanyReportsValidationCopy.invalidParameter(parameter),
  });
};

export const resolveSearchCompanyReportsRequest = (
  input: unknown,
): SearchCompanyReportsRequest => {
  assertObjectInput(
    input,
    (actual) =>
      new InvalidSearchCompanyReportsRequest({
        code: "invalid_parameter",
        parameter: "input",
        reason: "invalid_type",
        expected: searchCompanyReportsValidationCopy.inputExpected,
        actual,
        message: searchCompanyReportsValidationCopy.inputMustBeObject,
      }),
  );

  assertNoUnknownKeys(
    input,
    allowedKeys,
    (key, actual) =>
      new InvalidSearchCompanyReportsRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual,
        message: searchCompanyReportsValidationCopy.unknownParameter(key),
      }),
  );

  const result = decodeSearchCompanyReportsRequest(input);

  if (result._tag === "Right") {
    validateResolvedRequest(result.right);
    return result.right;
  }

  throw toInvalidSearchCompanyReportsRequest(input, result.left);
};
