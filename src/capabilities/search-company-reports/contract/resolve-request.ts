import { type ParseResult } from "effect";

import {
  assertNoUnknownKeys,
  assertObjectInput,
  assertYYYYMMDDDateRange,
  getFirstParameterIssues,
  normalizeTextFilterFields,
} from "../../request-validation.ts";
import { disclosureTypeItems } from "../../disclosure-types/data.ts";
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
const knownDisclosureTypeCodes: ReadonlySet<string> = new Set(
  disclosureTypeItems.map((item) => item.code),
);

const formatDateUtc = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;

const toUtcDate = (value: string): Date =>
  new Date(
    Date.UTC(
      Number.parseInt(value.slice(0, 4), 10),
      Number.parseInt(value.slice(4, 6), 10) - 1,
      Number.parseInt(value.slice(6, 8), 10),
    ),
  );

const subtractUtcYears = (value: string, years: number): string => {
  const date = toUtcDate(value);
  const targetYear = date.getUTCFullYear() - years;
  const targetMonth = date.getUTCMonth();
  const targetDay = date.getUTCDate();
  const candidate = new Date(Date.UTC(targetYear, targetMonth, targetDay));

  if (candidate.getUTCMonth() === targetMonth) {
    return formatDateUtc(candidate);
  }

  return formatDateUtc(new Date(Date.UTC(targetYear, targetMonth + 1, 0)));
};

const assertCompanyReportsDateWindow = (
  request: SearchCompanyReportsRequest,
): void => {
  const minimumStartDate = subtractUtcYears(request.endDate, 10);

  if (request.startDate < minimumStartDate) {
    throw new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "startDate",
      reason: "date_range_too_wide",
      expected: "date_range_at_most_10_years",
      actual: { startDate: request.startDate, endDate: request.endDate },
      message: searchCompanyReportsValidationCopy.dateRangeMustBeAtMostTenYears(
        request.startDate,
        request.endDate,
        minimumStartDate,
      ),
    });
  }
};

const assertKnownDisclosureTypes = (
  disclosureTypes: readonly string[],
): void => {
  const unknownCodes = [
    ...new Set(
      disclosureTypes.filter((code) => !knownDisclosureTypeCodes.has(code)),
    ),
  ];

  if (unknownCodes.length > 0) {
    throw new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter: "disclosureTypes",
      reason: "unknown_code",
      expected: "known_disclosure_type_code",
      actual: unknownCodes,
      message: searchCompanyReportsValidationCopy.mustUseKnownDisclosureTypeCodes(
        "disclosureTypes",
        unknownCodes,
      ),
    });
  }
};

const validateResolvedRequest = (request: SearchCompanyReportsRequest): void => {
  assertKnownDisclosureTypes(request.disclosureTypes);

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

  assertCompanyReportsDateWindow(request);
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
    case "string":
      return "non_empty_string";
    case "stringArray":
      return rule.expectedToken;
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
    case "string":
      return searchCompanyReportsValidationCopy.expectedNonEmptyString;
    case "stringArray":
      return searchCompanyReportsValidationCopy.expectedStringArray;
  }
};

const getPatternFormatMessage = (
  parameter: SearchCompanyReportsInputKey,
  expected: string,
): string => {
  switch (parameter) {
    case "companyCode":
      return searchCompanyReportsValidationCopy.mustUseDartCompanyCode(parameter);
    case "industryCode":
      return searchCompanyReportsValidationCopy.mustUseIndustryCode(parameter);
    default:
      return searchCompanyReportsValidationCopy.mustUseKnownPattern(
        parameter,
        expected,
      );
  }
};

const getEnumChoiceMessage = (
  parameter: SearchCompanyReportsInputKey,
  choices: readonly string[],
): string => {
  switch (parameter) {
    case "corporationType":
      return searchCompanyReportsValidationCopy.mustUseCorporationType(parameter);
    case "closingAccountsMonth":
      return searchCompanyReportsValidationCopy.mustUseClosingAccountsMonth(
        parameter,
      );
    default:
      return searchCompanyReportsValidationCopy.mustBeOneOf(parameter, choices);
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

  if (rule.kind === "stringArray") {
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: Array.isArray(actual) ? "invalid_format" : "invalid_type",
      expected: getExpectedToken(rule),
      actual,
      message: Array.isArray(actual)
        ? searchCompanyReportsValidationCopy.mustUseDisclosureTypeCodes(parameter)
        : searchCompanyReportsValidationCopy.mustBeStringArray(parameter),
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
      message: getEnumChoiceMessage(parameter, choices),
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

  if (rule.kind === "string" && rule.nonEmpty && actual.length === 0) {
    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: "empty_string",
      expected: getExpectedToken(rule),
      actual,
      message: searchCompanyReportsValidationCopy.mustNotBeEmpty(parameter),
    });
  }

  if (rule.kind === "date" || rule.kind === "patternString") {
    const expected = getExpectedToken(rule);

    return new InvalidSearchCompanyReportsRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_format",
      expected,
      actual,
      message:
        rule.kind === "date"
          ? searchCompanyReportsValidationCopy.mustUseDateFormat(parameter)
          : getPatternFormatMessage(parameter, expected),
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

  const normalizedInput = normalizeTextFilterFields(input, [
    "presenterName",
    "reportName",
  ]);
  const result = decodeSearchCompanyReportsRequest(normalizedInput);

  if (result._tag === "Right") {
    validateResolvedRequest(result.right);
    return result.right;
  }

  throw toInvalidSearchCompanyReportsRequest(normalizedInput, result.left);
};
