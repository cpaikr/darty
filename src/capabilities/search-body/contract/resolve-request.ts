import { ParseResult } from "effect";

import { searchBodyValidationCopy } from "../copy.ts";
import { InvalidSearchBodyRequest } from "./errors.ts";
import {
  searchBodyFieldSpecs,
  decodeSearchBodyRequest,
  type SearchBodyFieldSpec,
  type SearchBodyInputKey,
  type SearchBodyRawInput,
  type SearchBodyRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(searchBodyFieldSpecs));
const orderedInputKeys = Object.keys(
  searchBodyFieldSpecs,
) as readonly SearchBodyInputKey[];

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

const validateResolvedRequest = (request: SearchBodyRequest): void => {
  if (!isRealYYYYMMDDDate(request.startDate)) {
    throw new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter: "startDate",
      reason: "invalid_calendar_date",
      expected: "date_YYYYMMDD",
      actual: request.startDate,
      message: searchBodyValidationCopy.mustBeRealDate(
        "startDate",
        request.startDate,
      ),
    });
  }

  if (!isRealYYYYMMDDDate(request.endDate)) {
    throw new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter: "endDate",
      reason: "invalid_calendar_date",
      expected: "date_YYYYMMDD",
      actual: request.endDate,
      message: searchBodyValidationCopy.mustBeRealDate(
        "endDate",
        request.endDate,
      ),
    });
  }

  if (request.startDate > request.endDate) {
    throw new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter: "startDate",
      reason: "start_date_after_end_date",
      expected: "date_range_start_lte_end",
      actual: {
        startDate: request.startDate,
        endDate: request.endDate,
      },
      message: searchBodyValidationCopy.startDateMustNotBeAfterEndDate(
        request.startDate,
        request.endDate,
      ),
    });
  }
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

const toPathArray = (
  path: ParseResult.Path,
): readonly PropertyKey[] =>
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
  readonly parameter: SearchBodyInputKey | undefined;
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

const toInvalidSearchBodyRequest = (
  input: Partial<SearchBodyRawInput> & Record<string, unknown>,
  error: ParseResult.ParseError,
): InvalidSearchBodyRequest => {
  const { parameter, issues } = getParameterIssues(error);

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
  input: Partial<SearchBodyRawInput> & Record<string, unknown>,
): SearchBodyRequest => {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidSearchBodyRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: searchBodyValidationCopy.inputExpected,
      actual: input,
      message: searchBodyValidationCopy.inputMustBeObject,
    });
  }

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidSearchBodyRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: searchBodyValidationCopy.unknownParameter(key),
      });
    }
  }

  const result = decodeSearchBodyRequest(input);

  if (result._tag === "Right") {
    validateResolvedRequest(result.right);
    return result.right;
  }

  throw toInvalidSearchBodyRequest(input, result.left);
};
