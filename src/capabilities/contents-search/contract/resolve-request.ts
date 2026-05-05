import { ParseResult } from "effect";

import { contentsSearchValidationCopy } from "../copy.ts";
import { InvalidContentsSearchRequest } from "./errors.ts";
import {
  contentsSearchFieldSpecs,
  decodeContentsSearchRequest,
  type ContentsSearchFieldSpec,
  type ContentsSearchInputKey,
  type ContentsSearchRawInput,
  type ContentsSearchRequest,
} from "./request.ts";

const allowedKeys = new Set<string>(Object.keys(contentsSearchFieldSpecs));
const orderedInputKeys = Object.keys(
  contentsSearchFieldSpecs,
) as readonly ContentsSearchInputKey[];

type CollectedParseIssue = {
  readonly path: readonly PropertyKey[];
  readonly issue: ParseResult.ParseIssue;
};

const getExpectedToken = (rule: ContentsSearchFieldSpec): string => {
  switch (rule.kind) {
    case "integer":
      return `integer_between_${rule.minimum}_and_${rule.maximum}`;
    case "enum":
      return `one_of:${rule.enumValues.join(",")}`;
    case "string":
      return "non_empty_string";
    case "date":
      return "date_YYYYMMDD";
  }
};

const getExpectedDescription = (rule: ContentsSearchFieldSpec): string => {
  switch (rule.kind) {
    case "integer":
      return contentsSearchValidationCopy.expectedIntegerBetween(
        rule.minimum,
        rule.maximum,
      );
    case "enum":
      return contentsSearchValidationCopy.expectedOneOf(rule.enumValues);
    case "string":
      return contentsSearchValidationCopy.expectedNonEmptyString;
    case "date":
      return contentsSearchValidationCopy.expectedDateYYYYMMDD;
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
  readonly parameter: ContentsSearchInputKey | undefined;
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

const toInvalidContentsSearchRequest = (
  input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  error: ParseResult.ParseError,
): InvalidContentsSearchRequest => {
  const { parameter, issues } = getParameterIssues(error);

  if (parameter === undefined) {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: contentsSearchValidationCopy.inputExpected,
      actual: input,
      message: contentsSearchValidationCopy.inputMustBeObject,
    });
  }

  const rule = contentsSearchFieldSpecs[parameter];
  const actual = input[parameter];

  if (issues.some((issue) => issue._tag === "Missing")) {
    return new InvalidContentsSearchRequest({
      code: "missing_parameter",
      parameter,
      reason: "required",
      expected: getExpectedToken(rule),
      message: contentsSearchValidationCopy.missingRequired(
        parameter,
        getExpectedDescription(rule),
      ),
    });
  }

  if (rule.kind === "enum") {
    const choices = [...rule.enumValues];

    if (typeof actual !== "string") {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: "string",
        actual,
        message: contentsSearchValidationCopy.mustBeString(parameter),
      });
    }

    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_choice",
      expected: getExpectedToken(rule),
      actual,
      message: contentsSearchValidationCopy.mustBeOneOf(parameter, choices),
    });
  }

  if (rule.kind === "integer") {
    if (!Number.isInteger(actual)) {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: "integer",
        actual,
        message: contentsSearchValidationCopy.mustBeInteger(parameter),
      });
    }

    const numericActual = actual as number;

    if (numericActual < rule.minimum || numericActual > rule.maximum) {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "out_of_range",
        expected: getExpectedToken(rule),
        actual: numericActual,
        message: contentsSearchValidationCopy.mustBeInRange(
          parameter,
          rule.minimum,
          rule.maximum,
        ),
      });
    }
  }

  if (typeof actual !== "string") {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_type",
      expected: "string",
      actual,
      message: contentsSearchValidationCopy.mustBeString(parameter),
    });
  }

  if (rule.kind === "string" && rule.nonEmpty && actual.length === 0) {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "empty_string",
      expected: getExpectedToken(rule),
      actual,
      message: contentsSearchValidationCopy.mustNotBeEmpty(parameter),
    });
  }

  if (rule.kind === "date") {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_format",
      expected: getExpectedToken(rule),
      actual,
      message: contentsSearchValidationCopy.mustUseDateFormat(parameter),
    });
  }

  return new InvalidContentsSearchRequest({
    code: "invalid_parameter",
    parameter,
    reason: "invalid_parameter",
    actual,
    message: contentsSearchValidationCopy.invalidParameter(parameter),
  });
};

export const resolveContentsSearchRequest = (
  input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
): ContentsSearchRequest => {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter: "input",
      reason: "invalid_type",
      expected: contentsSearchValidationCopy.inputExpected,
      actual: input,
      message: contentsSearchValidationCopy.inputMustBeObject,
    });
  }

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidContentsSearchRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: contentsSearchValidationCopy.unknownParameter(key),
      });
    }
  }

  const result = decodeContentsSearchRequest(input);

  if (result._tag === "Right") {
    return result.right;
  }

  throw toInvalidContentsSearchRequest(input, result.left);
};
