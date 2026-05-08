import { ParseResult } from "effect";

import { searchCompanyReportsValidationCopy } from "../copy.ts";
import { InvalidSearchCompanyReportsRequest } from "./errors.ts";
import {
  decodeSearchCompanyReportsRequest,
  searchCompanyReportsFieldSpecs,
  type SearchCompanyReportsFieldSpec,
  type SearchCompanyReportsInputKey,
  type SearchCompanyReportsRawInput,
  type SearchCompanyReportsRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(searchCompanyReportsFieldSpecs));
const orderedInputKeys = Object.keys(
  searchCompanyReportsFieldSpecs,
) as readonly SearchCompanyReportsInputKey[];

type CollectedParseIssue = {
  readonly path: readonly PropertyKey[];
  readonly issue: ParseResult.ParseIssue;
};

const isRealYYYYMMDDDate = (value: string): boolean => {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10);
  const day = Number.parseInt(value.slice(6, 8), 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const validateResolvedRequest = (request: SearchCompanyReportsRequest): void => {
  if (!isRealYYYYMMDDDate(request.startDate)) {
    throw new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "startDate",
      reason: "invalid_calendar_date",
      expected: "date_YYYYMMDD",
      actual: request.startDate,
      message: searchCompanyReportsValidationCopy.mustBeRealDate(
        "startDate",
        request.startDate,
      ),
    });
  }

  if (!isRealYYYYMMDDDate(request.endDate)) {
    throw new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "endDate",
      reason: "invalid_calendar_date",
      expected: "date_YYYYMMDD",
      actual: request.endDate,
      message: searchCompanyReportsValidationCopy.mustBeRealDate(
        "endDate",
        request.endDate,
      ),
    });
  }

  if (request.startDate > request.endDate) {
    throw new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "startDate",
      reason: "start_date_after_end_date",
      expected: "date_range_start_lte_end",
      actual: {
        startDate: request.startDate,
        endDate: request.endDate,
      },
      message: searchCompanyReportsValidationCopy.startDateMustNotBeAfterEndDate(
        request.startDate,
        request.endDate,
      ),
    });
  }
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

const toPathArray = (path: ParseResult.Path): readonly PropertyKey[] =>
  Array.isArray(path) ? path : [path as PropertyKey];

const collectParseIssues = (
  issue: ParseResult.ParseIssue,
  path: readonly PropertyKey[] = [],
): readonly CollectedParseIssue[] => {
  switch (issue._tag) {
    case "Pointer":
      return collectParseIssues(issue.issue, [...path, ...toPathArray(issue.path)]);
    case "Composite":
      return (Array.isArray(issue.issues) ? issue.issues : [issue.issues]).flatMap(
        (nestedIssue) => collectParseIssues(nestedIssue, path),
      );
    case "Refinement":
    case "Transformation":
      return collectParseIssues(issue.issue, path);
    default:
      return [{ path, issue }];
  }
};

const getParameterIssues = (
  error: ParseResult.ParseError,
): {
  readonly parameter: SearchCompanyReportsInputKey | undefined;
  readonly issues: readonly ParseResult.ParseIssue[];
} => {
  const collectedIssues = collectParseIssues(error.issue);

  for (const key of orderedInputKeys) {
    const matchingIssues = collectedIssues
      .filter((issue) => issue.path[0] === key)
      .map((issue) => issue.issue);

    if (matchingIssues.length > 0) {
      return {
        parameter: key,
        issues: matchingIssues,
      };
    }
  }

  return {
    parameter: undefined,
    issues: collectedIssues.map((issue) => issue.issue),
  };
};

const toInvalidSearchCompanyReportsRequest = (
  input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
  error: ParseResult.ParseError,
): InvalidSearchCompanyReportsRequest => {
  const { parameter, issues } = getParameterIssues(error);

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
  input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
): SearchCompanyReportsRequest => {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: searchCompanyReportsValidationCopy.inputExpected,
      actual: input,
      message: searchCompanyReportsValidationCopy.inputMustBeObject,
    });
  }

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidSearchCompanyReportsRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: searchCompanyReportsValidationCopy.unknownParameter(key),
      });
    }
  }

  const result = decodeSearchCompanyReportsRequest(input);

  if (result._tag === "Right") {
    validateResolvedRequest(result.right);
    return result.right;
  }

  throw toInvalidSearchCompanyReportsRequest(input, result.left);
};
