import { Schema } from "effect";

import {
  annotateCapabilityInput,
  describeCapabilityInput,
  type CapabilityInputProperty,
} from "../types.ts";

const datePattern = /^\d{8}$/;

const ContentsSearchDateString = Schema.String.pipe(
  Schema.pattern(datePattern),
  Schema.annotations({
    identifier: "ContentsSearchDateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const contentsSearchSortByValues = ["date", "reportName"] as const;
export type ContentsSearchSortBy =
  (typeof contentsSearchSortByValues)[number];

const ContentsSearchSortBySchema = Schema.Literal(...contentsSearchSortByValues);

export const contentsSearchSortDirectionValues = ["asc", "desc"] as const;
export type ContentsSearchSortDirection =
  (typeof contentsSearchSortDirectionValues)[number];

const ContentsSearchSortDirectionSchema = Schema.Literal(
  ...contentsSearchSortDirectionValues,
);

const defaultRequest = {
  page: 1,
  sortBy: "date",
  sortDirection: "desc",
} as const;

const contentsSearchRequestFields = {
  page: annotateCapabilityInput(
    Schema.optionalWith(
      Schema.Int.pipe(
        Schema.greaterThanOrEqualTo(1),
        Schema.lessThanOrEqualTo(100),
      ),
      { default: () => defaultRequest.page },
    ),
    {
      aliases: ["page"],
      cliValueHint: "<number>",
      description: "1-based search results page to request.",
      status: "observed",
      defaultValue: defaultRequest.page,
    },
  ),
  sortBy: annotateCapabilityInput(
    Schema.optionalWith(ContentsSearchSortBySchema, {
      default: () => defaultRequest.sortBy,
    }),
    {
      aliases: ["sort-by"],
      description: "Sort field for results.",
      status: "observed",
      defaultValue: defaultRequest.sortBy,
    },
  ),
  sortDirection: annotateCapabilityInput(
    Schema.optionalWith(ContentsSearchSortDirectionSchema, {
      default: () => defaultRequest.sortDirection,
    }),
    {
      aliases: ["sort-direction"],
      description: "Sort direction for the selected sort field.",
      status: "observed",
      defaultValue: defaultRequest.sortDirection,
    },
  ),
  keyword: annotateCapabilityInput(Schema.NonEmptyString, {
    aliases: ["keyword"],
    description: "Main body-content search text.",
    status: "observed",
  }),
  startDate: annotateCapabilityInput(ContentsSearchDateString, {
    aliases: ["start-date"],
    cliValueHint: "<YYYYMMDD>",
    description: "Inclusive receipt start date in YYYYMMDD format.",
    status: "observed",
  }),
  endDate: annotateCapabilityInput(ContentsSearchDateString, {
    aliases: ["end-date"],
    cliValueHint: "<YYYYMMDD>",
    description: "Inclusive receipt end date in YYYYMMDD format.",
    status: "observed",
  }),
  companyCode: annotateCapabilityInput(Schema.optional(Schema.NonEmptyString), {
    aliases: ["company-code"],
    description: "Filter by DART company code.",
    status: "observed",
  }),
  presenterName: annotateCapabilityInput(
    Schema.optional(Schema.NonEmptyString),
    {
      aliases: ["presenter-name"],
      description: "Filter by presenter name when DART exposes that field.",
      status: "observed",
    },
  ),
  reportName: annotateCapabilityInput(Schema.optional(Schema.NonEmptyString), {
    aliases: ["report-name"],
    description: "Filter by report title as currently honored by DART.",
    status: "observed",
  }),
} as const;

export const ContentsSearchRequestSchema = Schema.Struct(
  contentsSearchRequestFields,
).annotations({
  identifier: "ContentsSearchRequest",
  description: "Public semantic input contract for `contents-search`.",
});

export type ContentsSearchRawInput = typeof ContentsSearchRequestSchema.Encoded;
export type ContentsSearchRequest = typeof ContentsSearchRequestSchema.Type;

export const contentsSearchInputProperties = describeCapabilityInput(
  ContentsSearchRequestSchema,
);

const contentsSearchInputPropertyByKey = new Map(
  contentsSearchInputProperties.map((property) => [property.key, property]),
);

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

type ContentsSearchInputKey = keyof ContentsSearchRawInput;

const allowedKeys = new Set<string>(
  contentsSearchInputProperties.map((property) => property.key),
);

const getContentsSearchInputProperty = (
  key: ContentsSearchInputKey,
): CapabilityInputProperty => {
  const property = contentsSearchInputPropertyByKey.get(key);

  if (property === undefined) {
    throw new Error(`Missing contents-search input property metadata for "${key}".`);
  }

  return property;
};

const getDefaultValue = <Value extends string | number>(
  property: CapabilityInputProperty,
): Value => {
  const defaultValue = property.defaultValue;

  if (typeof defaultValue === "string" || typeof defaultValue === "number") {
    return defaultValue as Value;
  }

  throw new Error(`Missing default value metadata for "${property.key}".`);
};

const getEnumValues = (
  property: CapabilityInputProperty,
): readonly string[] => {
  if (property.enumValues === undefined) {
    throw new Error(`Missing enum values for "${property.key}".`);
  }

  return property.enumValues.filter(
    (value): value is string => typeof value === "string",
  );
};

const getNumberBounds = (
  property: CapabilityInputProperty,
): {
  readonly minimum: number;
  readonly maximum: number;
} => {
  if (
    typeof property.minimum === "number" &&
    typeof property.maximum === "number"
  ) {
    return {
      minimum: property.minimum,
      maximum: property.maximum,
    };
  }

  throw new Error(`Missing numeric bounds for "${property.key}".`);
};

const getExpectedRequiredValue = (
  property: CapabilityInputProperty,
): string => {
  if (property.pattern !== undefined && property.cliValueHint !== undefined) {
    return `a ${property.cliValueHint.slice(1, -1)} date string`;
  }

  return "a non-empty string";
};

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

const readOptionalText = <
  Key extends "companyCode" | "presenterName" | "reportName",
>(
  input: Partial<ContentsSearchRawInput>,
  key: Key,
): string | undefined => {
  const property = getContentsSearchInputProperty(key);
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

  const minLength = property.minLength;

  if (typeof minLength === "number" && minLength > 0 && value.length < minLength) {
    return failInvalidParameter(
      key,
      "empty_string",
      `Parameter "${key}" must not be empty.`,
      { actual: value, expected: "a non-empty string" },
    );
  }

  return value;
};

const readRequiredText = <
  Key extends "keyword" | "startDate" | "endDate",
>(
  input: Partial<ContentsSearchRawInput>,
  key: Key,
): string => {
  const property = getContentsSearchInputProperty(key);
  const value = input[key];
  const expected = getExpectedRequiredValue(property);

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

  const minLength = property.minLength;

  if (typeof minLength === "number" && minLength > 0 && value.length < minLength) {
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
): number => {
  const property = getContentsSearchInputProperty(key);
  const value = input[key];
  const fallback = getDefaultValue<number>(property);
  const { minimum, maximum } = getNumberBounds(property);

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

  if (value < minimum || value > maximum) {
    return failInvalidParameter(
      key,
      "out_of_range",
      `Parameter "${key}" must be between ${minimum} and ${maximum}.`,
      {
        actual: value,
        expected: `an integer between ${minimum} and ${maximum}`,
      },
    );
  }

  return value;
};

const readChoiceWithDefault = <
  Key extends "sortBy" | "sortDirection",
>(
  input: Partial<ContentsSearchRawInput>,
  key: Key,
): ContentsSearchRequest[Key] => {
  const property = getContentsSearchInputProperty(key);
  const value = input[key];
  const fallback = getDefaultValue<ContentsSearchRequest[Key]>(property);
  const choices = getEnumValues(property);

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

  if (choices.includes(value)) {
    return value as ContentsSearchRequest[Key];
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
  const property = getContentsSearchInputProperty(key);
  const value = readRequiredText(input, key);

  if (property.pattern === undefined) {
    throw new Error(`Missing date pattern metadata for "${key}".`);
  }

  if (!new RegExp(property.pattern).test(value)) {
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
    page: readIntegerWithDefault(input, "page"),
    sortBy: readChoiceWithDefault(input, "sortBy"),
    sortDirection: readChoiceWithDefault(input, "sortDirection"),
    keyword: readRequiredText(input, "keyword"),
    startDate: readDateString(input, "startDate"),
    endDate: readDateString(input, "endDate"),
    companyCode: readOptionalText(input, "companyCode"),
    presenterName: readOptionalText(input, "presenterName"),
    reportName: readOptionalText(input, "reportName"),
  };
};
