import { Schema } from "effect";

import type { Dsab007ContentsSearchInput } from "../../dart/dsab007/contracts.ts";
import type { Dsab007ContentsSearchResult } from "../../dart/dsab007/models.ts";
import type { OperationParameter } from "./types.ts";

const datePattern = /^\d{8}$/;

export const dsab007ContentsSortByValues = ["date", "reportName"] as const;
export type Dsab007ContentsSortBy =
  (typeof dsab007ContentsSortByValues)[number];

export const dsab007ContentsSortDirectionValues = ["asc", "desc"] as const;
export type Dsab007ContentsSortDirection =
  (typeof dsab007ContentsSortDirectionValues)[number];

/**
 * Raw semantic operation input accepted from transport layers such as CLI, MCP,
 * or a future SDK.
 *
 * Defaults are not applied here so transports can preserve which fields callers
 * omitted before passing the payload through the shared resolver.
 */
export type Dsab007ContentsRawInput = {
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
  readonly maxLinks?: number | undefined;
  readonly sortBy?: Dsab007ContentsSortBy | undefined;
  readonly sortDirection?: Dsab007ContentsSortDirection | undefined;
  readonly keyword?: string | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly companyCode?: string | undefined;
  readonly companyName?: string | undefined;
  readonly presenterName?: string | undefined;
  readonly secondaryKeyword?: string | undefined;
  readonly filerCode?: string | undefined;
  readonly disclosureTypeTab?: string | undefined;
  readonly tocSearch?: string | undefined;
  readonly documentType?: string | undefined;
  readonly reportName?: string | undefined;
  readonly decadeType?: string | undefined;
};

/**
 * Canonical semantic request shape after defaults and validation.
 *
 * Callers should execute the operation only after they have this resolved
 * contract.
 */
export type Dsab007ContentsResolvedInput = {
  readonly page: number;
  readonly limit: number;
  readonly maxLinks: number;
  readonly sortBy: Dsab007ContentsSortBy;
  readonly sortDirection: Dsab007ContentsSortDirection;
  readonly keyword: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly companyCode?: string | undefined;
  readonly companyName?: string | undefined;
  readonly presenterName?: string | undefined;
  readonly secondaryKeyword?: string | undefined;
  readonly filerCode?: string | undefined;
  readonly disclosureTypeTab?: string | undefined;
  readonly tocSearch?: string | undefined;
  readonly documentType?: string | undefined;
  readonly reportName?: string | undefined;
  readonly decadeType?: string | undefined;
};

export type Dsab007ContentsOperationResult = Omit<
  Dsab007ContentsSearchResult,
  "request"
> & {
  readonly request: Dsab007ContentsResolvedInput;
};

export class InvalidDsab007ContentsOperationInput extends Schema.TaggedError<InvalidDsab007ContentsOperationInput>()(
  "InvalidDsab007ContentsOperationInput",
  {
    code: Schema.Literal(
      "missing_parameter",
      "invalid_parameter",
      "unknown_parameter",
    ),
    parameter: Schema.String,
    reason: Schema.String,
    expected: Schema.optional(Schema.String),
    actual: Schema.optional(Schema.Unknown),
    message: Schema.String,
  },
) {}

const defaultResolvedInput = {
  page: 1,
  limit: 10,
  maxLinks: 10,
  sortBy: "date",
  sortDirection: "desc",
} as const satisfies Pick<
  Dsab007ContentsResolvedInput,
  "page" | "limit" | "maxLinks" | "sortBy" | "sortDirection"
>;

const formatDefaultValue = (value: string | number): string => String(value);

/**
 * Shared semantic parameter definitions for `dsab007-contents`.
 *
 * This is the human-readable surface exposed to agents. Any DART-shaped field
 * names stay behind the internal mapper.
 */
export const dsab007ContentsInputParameters = [
  {
    key: "page",
    aliases: ["page"],
    cliFlags: ["--page"],
    valueHint: "<number>",
    description: "1-based search results page to request.",
    status: "observed",
    required: false,
    defaultValue: formatDefaultValue(defaultResolvedInput.page),
  },
  {
    key: "limit",
    aliases: ["limit"],
    cliFlags: ["--limit"],
    valueHint: "<number>",
    description: "Requested result count per page.",
    status: "observed",
    required: false,
    defaultValue: formatDefaultValue(defaultResolvedInput.limit),
  },
  {
    key: "maxLinks",
    aliases: ["max-links"],
    cliFlags: ["--max-links"],
    valueHint: "<number>",
    description: "Requested number of pagination links in the DART pager.",
    status: "observed",
    required: false,
    defaultValue: formatDefaultValue(defaultResolvedInput.maxLinks),
  },
  {
    key: "sortBy",
    aliases: ["sort-by"],
    cliFlags: ["--sort-by"],
    valueHint: `<${dsab007ContentsSortByValues.join("|")}>`,
    description: "Sort field for results.",
    status: "observed",
    required: false,
    defaultValue: defaultResolvedInput.sortBy,
  },
  {
    key: "sortDirection",
    aliases: ["sort-direction"],
    cliFlags: ["--sort-direction"],
    valueHint: `<${dsab007ContentsSortDirectionValues.join("|")}>`,
    description: "Sort direction for the selected sort field.",
    status: "observed",
    required: false,
    defaultValue: defaultResolvedInput.sortDirection,
  },
  {
    key: "keyword",
    aliases: ["keyword"],
    cliFlags: ["--keyword"],
    valueHint: "<text>",
    description: "Main body-content search text.",
    status: "observed",
    required: true,
  },
  {
    key: "startDate",
    aliases: ["start-date"],
    cliFlags: ["--start-date"],
    valueHint: "<YYYYMMDD>",
    description: "Inclusive receipt start date in YYYYMMDD format.",
    status: "observed",
    required: true,
  },
  {
    key: "endDate",
    aliases: ["end-date"],
    cliFlags: ["--end-date"],
    valueHint: "<YYYYMMDD>",
    description: "Inclusive receipt end date in YYYYMMDD format.",
    status: "observed",
    required: true,
  },
  {
    key: "companyCode",
    aliases: ["company-code"],
    cliFlags: ["--company-code"],
    valueHint: "<text>",
    description: "Filter by DART company code.",
    status: "observed",
    required: false,
  },
  {
    key: "companyName",
    aliases: ["company-name"],
    cliFlags: ["--company-name"],
    valueHint: "<text>",
    description: "Filter by company name as shown in DART search.",
    status: "observed",
    required: false,
  },
  {
    key: "presenterName",
    aliases: ["presenter-name"],
    cliFlags: ["--presenter-name"],
    valueHint: "<text>",
    description: "Filter by presenter name when DART exposes that field.",
    status: "observed",
    required: false,
  },
  {
    key: "secondaryKeyword",
    aliases: ["secondary-keyword"],
    cliFlags: ["--secondary-keyword"],
    valueHint: "<text>",
    description: "Secondary keyword field sent to DART.",
    status: "inferred",
    required: false,
  },
  {
    key: "filerCode",
    aliases: ["filer-code"],
    cliFlags: ["--filer-code"],
    valueHint: "<text>",
    description: "Filer-code filter sent to DART.",
    status: "inferred",
    required: false,
  },
  {
    key: "disclosureTypeTab",
    aliases: ["disclosure-type-tab"],
    cliFlags: ["--disclosure-type-tab"],
    valueHint: "<text>",
    description: "Disclosure-type tab selector sent to DART.",
    status: "inferred",
    required: false,
  },
  {
    key: "tocSearch",
    aliases: ["toc-search"],
    cliFlags: ["--toc-search"],
    valueHint: "<text>",
    description: "Table-of-contents search toggle or mode field.",
    status: "inferred",
    required: false,
  },
  {
    key: "documentType",
    aliases: ["document-type"],
    cliFlags: ["--document-type"],
    valueHint: "<text>",
    description: "Document type filter label or code sent to DART.",
    status: "inferred",
    required: false,
  },
  {
    key: "reportName",
    aliases: ["report-name"],
    cliFlags: ["--report-name"],
    valueHint: "<text>",
    description: "Report-name filter sent to DART.",
    status: "observed",
    required: false,
  },
  {
    key: "decadeType",
    aliases: ["decade-type"],
    cliFlags: ["--decade-type"],
    valueHint: "<text>",
    description: "Date-grouping selector sent to DART.",
    status: "inferred",
    required: false,
  },
] as const satisfies readonly OperationParameter[];

const dsab007ContentsAllowedKeys = new Set<string>(
  dsab007ContentsInputParameters.map((parameter) => parameter.key),
);

const failInvalidParameter = (
  parameter: string,
  reason: string,
  message: string,
  options?: {
    readonly actual?: unknown;
    readonly expected?: string;
  },
): never => {
  throw new InvalidDsab007ContentsOperationInput({
    code: "invalid_parameter",
    parameter,
    reason,
    expected: options?.expected,
    actual: options?.actual,
    message,
  });
};

const failMissingParameter = (
  parameter: string,
  expected: string,
): never => {
  throw new InvalidDsab007ContentsOperationInput({
    code: "missing_parameter",
    parameter,
    reason: "required",
    expected,
    message: `Missing required parameter "${parameter}". Expected ${expected}.`,
  });
};

const readOptionalText = (
  input: Partial<Dsab007ContentsRawInput>,
  key: keyof Dsab007ContentsRawInput,
): string | undefined => {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return failInvalidParameter(
      key,
      "invalid_type",
      `Parameter "${key}" must be a string.`,
      { actual: value, expected: "a string" },
    );
  }

  if (value.length === 0) {
    return failInvalidParameter(
      key,
      "empty_string",
      `Parameter "${key}" must not be empty.`,
      { actual: value, expected: "a non-empty string" },
    );
  }

  return value;
};

const readRequiredText = (
  input: Partial<Dsab007ContentsRawInput>,
  key: "keyword" | "startDate" | "endDate",
  expected: string,
): string => {
  const value = input[key];

  if (value === undefined) {
    return failMissingParameter(key, expected);
  }

  if (typeof value !== "string") {
    return failInvalidParameter(
      key,
      "invalid_type",
      `Parameter "${key}" must be a string.`,
      { actual: value, expected: "a string" },
    );
  }

  if (value.length === 0) {
    return failInvalidParameter(
      key,
      "empty_string",
      `Parameter "${key}" must not be empty.`,
      { actual: value, expected: expected },
    );
  }

  return value;
};

const readIntegerWithDefault = (
  input: Partial<Dsab007ContentsRawInput>,
  key: "page" | "limit" | "maxLinks",
  fallback: number,
  min: number,
  max: number,
): number => {
  const value = input[key];

  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value)) {
    return failInvalidParameter(
      key,
      "invalid_type",
      `Parameter "${key}" must be an integer.`,
      { actual: value, expected: "an integer" },
    );
  }

  if (value < min || value > max) {
    return failInvalidParameter(
      key,
      "out_of_range",
      `Parameter "${key}" must be between ${min} and ${max}.`,
      { actual: value, expected: `an integer between ${min} and ${max}` },
    );
  }

  return value;
};

const readChoiceWithDefault = <Choice extends string>(
  input: Partial<Dsab007ContentsRawInput>,
  key: "sortBy" | "sortDirection",
  choices: readonly Choice[],
  fallback: Choice,
): Choice => {
  const value = input[key];

  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    return failInvalidParameter(
      key,
      "invalid_type",
      `Parameter "${key}" must be a string.`,
      { actual: value, expected: `one of ${choices.join(", ")}` },
    );
  }

  if (choices.includes(value as Choice)) {
    return value as Choice;
  }

  return failInvalidParameter(
    key,
    "invalid_choice",
    `Parameter "${key}" must be one of: ${choices.join(", ")}.`,
    { actual: value, expected: `one of ${choices.join(", ")}` },
  );
};

const readDateString = (
  input: Partial<Dsab007ContentsRawInput>,
  key: "startDate" | "endDate",
): string => {
  const value = readRequiredText(input, key, "a YYYYMMDD date string");

  if (!datePattern.test(value)) {
    return failInvalidParameter(
      key,
      "invalid_format",
      `Parameter "${key}" must use YYYYMMDD format.`,
      { actual: value, expected: "YYYYMMDD" },
    );
  }

  return value;
};

/**
 * Applies defaults, rejects unknown keys, and validates the shared semantic
 * request contract before any DART-specific mapping or network execution.
 */
export const resolveDsab007ContentsInput = (
  input: Partial<Dsab007ContentsRawInput> & Record<string, unknown>,
): Dsab007ContentsResolvedInput => {
  for (const key of Object.keys(input)) {
    if (!dsab007ContentsAllowedKeys.has(key)) {
      throw new InvalidDsab007ContentsOperationInput({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: `Unknown parameter "${key}".`,
      });
    }
  }

  return {
    page: readIntegerWithDefault(input, "page", defaultResolvedInput.page, 1, 100),
    limit: readIntegerWithDefault(
      input,
      "limit",
      defaultResolvedInput.limit,
      1,
      100,
    ),
    maxLinks: readIntegerWithDefault(
      input,
      "maxLinks",
      defaultResolvedInput.maxLinks,
      1,
      100,
    ),
    sortBy: readChoiceWithDefault(
      input,
      "sortBy",
      dsab007ContentsSortByValues,
      defaultResolvedInput.sortBy,
    ),
    sortDirection: readChoiceWithDefault(
      input,
      "sortDirection",
      dsab007ContentsSortDirectionValues,
      defaultResolvedInput.sortDirection,
    ),
    keyword: readRequiredText(input, "keyword", "a non-empty string"),
    startDate: readDateString(input, "startDate"),
    endDate: readDateString(input, "endDate"),
    companyCode: readOptionalText(input, "companyCode"),
    companyName: readOptionalText(input, "companyName"),
    presenterName: readOptionalText(input, "presenterName"),
    secondaryKeyword: readOptionalText(input, "secondaryKeyword"),
    filerCode: readOptionalText(input, "filerCode"),
    disclosureTypeTab: readOptionalText(input, "disclosureTypeTab"),
    tocSearch: readOptionalText(input, "tocSearch"),
    documentType: readOptionalText(input, "documentType"),
    reportName: readOptionalText(input, "reportName"),
    decadeType: readOptionalText(input, "decadeType"),
  };
};

/**
 * Maps the public semantic request into the internal DART replay contract.
 *
 * This is the only operation-level seam that should know the DART-shaped field
 * names.
 */
export const toDsab007ContentsSearchInput = (
  input: Dsab007ContentsResolvedInput,
): Dsab007ContentsSearchInput => ({
  option: "contents",
  currentPage: input.page,
  maxResults: input.limit,
  maxLinks: input.maxLinks,
  sort: input.sortBy === "reportName" ? "rpt_nm" : "DATE",
  sortType: input.sortDirection,
  keyword: input.keyword,
  startDate: input.startDate,
  endDate: input.endDate,
  textCrpCik: input.companyCode,
  textCrpNm: input.companyName,
  textPresenterNm: input.presenterName,
  lateKeyword: input.secondaryKeyword,
  flrCik: input.filerCode,
  dspTypeTab: input.disclosureTypeTab,
  tocSrch: input.tocSearch,
  docType: input.documentType,
  reportName: input.reportName,
  decadeType: input.decadeType,
});

/**
 * Re-exposes the shared search result with the public semantic request echoed
 * back to callers instead of the internal DART replay request.
 */
export const toDsab007ContentsOperationResult = (
  request: Dsab007ContentsResolvedInput,
  result: Dsab007ContentsSearchResult,
): Dsab007ContentsOperationResult => ({
  ...result,
  request,
});
