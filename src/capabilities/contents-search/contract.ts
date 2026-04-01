import { Schema } from "effect";

import type { CapabilityParameter } from "../types.ts";

const datePattern = /^\d{8}$/;

export const contentsSearchSortByValues = ["date", "reportName"] as const;
export type ContentsSearchSortBy =
  (typeof contentsSearchSortByValues)[number];

export const contentsSearchSortDirectionValues = ["asc", "desc"] as const;
export type ContentsSearchSortDirection =
  (typeof contentsSearchSortDirectionValues)[number];

export type ContentsSearchRawInput = {
  readonly page?: number | undefined;
  readonly sortBy?: ContentsSearchSortBy | undefined;
  readonly sortDirection?: ContentsSearchSortDirection | undefined;
  readonly keyword?: string | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly companyCode?: string | undefined;
  readonly presenterName?: string | undefined;
  readonly reportName?: string | undefined;
};

export type ContentsSearchRequest = {
  readonly page: number;
  readonly sortBy: ContentsSearchSortBy;
  readonly sortDirection: ContentsSearchSortDirection;
  readonly keyword: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly companyCode?: string | undefined;
  readonly presenterName?: string | undefined;
  readonly reportName?: string | undefined;
};

export type ContentsSearchItem = {
  readonly company: {
    readonly name: string;
    readonly marketLabel?: string | undefined;
    readonly companyCode?: string | undefined;
  };
  readonly filing: {
    readonly receiptNumber: string;
    readonly documentNumber?: string | undefined;
    readonly reportTitle: string;
    readonly reportModifier?: string | undefined;
    readonly reportPeriod?: string | undefined;
    readonly reportNameSuffix?: string | undefined;
    readonly receiptDate: string;
  };
  readonly match: {
    readonly snippetText: string;
    readonly disclosureTypeLabel?: string | undefined;
    readonly contentTypeLabel?: string | undefined;
    readonly presenterName?: string | undefined;
  };
  readonly references: {
    readonly viewerUrl: string;
  };
  readonly evidence: {
    readonly reportNameRaw: string;
    readonly rawInfoText: string;
    readonly snippetHtml: string;
  };
};

export type ContentsSearchPagination = {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalCount: number;
  readonly returnedCount: number;
};

export type ContentsSearchMetadata = {
  readonly fetchedAt: string;
  readonly source: {
    readonly system: "dart";
    readonly surface: "dsab007";
    readonly endpoint: string;
  };
  readonly sourceBehavior: {
    readonly effectivePageSize: number;
    readonly effectivePagerWidth: number;
    readonly callerControlsPageSize: false;
    readonly callerControlsPagerWidth: false;
    readonly observationStatus: "observed";
  };
  readonly completeness: "complete" | "partial";
  readonly droppedItemCount: number;
};

export type ContentsSearchReferences = {
  readonly searchUrl: string;
};

export type ContentsSearchWarning = {
  readonly code: "partial_rows_dropped";
  readonly message: string;
  readonly droppedItemCount: number;
};

export type ContentsSearchResult = {
  readonly result: {
    readonly request: ContentsSearchRequest;
    readonly pagination: ContentsSearchPagination;
    readonly items: readonly ContentsSearchItem[];
  };
  readonly metadata: ContentsSearchMetadata;
  readonly references: ContentsSearchReferences;
  readonly warnings: readonly ContentsSearchWarning[];
};

export class InvalidContentsSearchRequest extends Schema.TaggedError<InvalidContentsSearchRequest>()(
  "InvalidContentsSearchRequest",
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

export class ContentsSearchFailure extends Schema.TaggedError<ContentsSearchFailure>()(
  "ContentsSearchFailure",
  {
    code: Schema.Literal(
      "invalid_request",
      "source_unavailable",
      "source_changed",
      "source_parse_failure",
      "internal_error",
    ),
    message: Schema.String,
    retryable: Schema.Boolean,
    parameter: Schema.optional(Schema.String),
    sourceUrl: Schema.optional(Schema.String),
  },
) {}

const defaultRequest = {
  page: 1,
  sortBy: "date",
  sortDirection: "desc",
} as const satisfies Pick<
  ContentsSearchRequest,
  "page" | "sortBy" | "sortDirection"
>;

const formatDefaultValue = (value: string | number): string => String(value);

export const contentsSearchParameters = [
  {
    key: "page",
    aliases: ["page"],
    cliFlags: ["--page"],
    valueHint: "<number>",
    description: "1-based search results page to request.",
    status: "observed",
    required: false,
    defaultValue: formatDefaultValue(defaultRequest.page),
  },
  {
    key: "sortBy",
    aliases: ["sort-by"],
    cliFlags: ["--sort-by"],
    valueHint: `<${contentsSearchSortByValues.join("|")}>`,
    description: "Sort field for results.",
    status: "observed",
    required: false,
    defaultValue: defaultRequest.sortBy,
  },
  {
    key: "sortDirection",
    aliases: ["sort-direction"],
    cliFlags: ["--sort-direction"],
    valueHint: `<${contentsSearchSortDirectionValues.join("|")}>`,
    description: "Sort direction for the selected sort field.",
    status: "observed",
    required: false,
    defaultValue: defaultRequest.sortDirection,
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
    key: "presenterName",
    aliases: ["presenter-name"],
    cliFlags: ["--presenter-name"],
    valueHint: "<text>",
    description: "Filter by presenter name when DART exposes that field.",
    status: "observed",
    required: false,
  },
  {
    key: "reportName",
    aliases: ["report-name"],
    cliFlags: ["--report-name"],
    valueHint: "<text>",
    description: "Filter by report title as currently honored by DART.",
    status: "observed",
    required: false,
  },
] as const satisfies readonly CapabilityParameter[];

const allowedKeys = new Set<string>(
  contentsSearchParameters.map((parameter) => parameter.key),
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
  throw new InvalidContentsSearchRequest({
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
  throw new InvalidContentsSearchRequest({
    code: "missing_parameter",
    parameter,
    reason: "required",
    expected,
    message: `Missing required parameter "${parameter}". Expected ${expected}.`,
  });
};

const readOptionalText = (
  input: Partial<ContentsSearchRawInput>,
  key: keyof ContentsSearchRawInput,
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
  input: Partial<ContentsSearchRawInput>,
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
      { actual: value, expected },
    );
  }

  return value;
};

const readIntegerWithDefault = (
  input: Partial<ContentsSearchRawInput>,
  key: "page",
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
  input: Partial<ContentsSearchRawInput>,
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
  input: Partial<ContentsSearchRawInput>,
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

export const resolveContentsSearchRequest = (
  input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
): ContentsSearchRequest => {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new InvalidContentsSearchRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual: input[key],
        message: `Unknown parameter "${key}".`,
      });
    }
  }

  return {
    page: readIntegerWithDefault(input, "page", defaultRequest.page, 1, 100),
    sortBy: readChoiceWithDefault(
      input,
      "sortBy",
      contentsSearchSortByValues,
      defaultRequest.sortBy,
    ),
    sortDirection: readChoiceWithDefault(
      input,
      "sortDirection",
      contentsSearchSortDirectionValues,
      defaultRequest.sortDirection,
    ),
    keyword: readRequiredText(input, "keyword", "a non-empty string"),
    startDate: readDateString(input, "startDate"),
    endDate: readDateString(input, "endDate"),
    companyCode: readOptionalText(input, "companyCode"),
    presenterName: readOptionalText(input, "presenterName"),
    reportName: readOptionalText(input, "reportName"),
  };
};
