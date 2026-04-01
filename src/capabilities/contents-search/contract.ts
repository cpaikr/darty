import { ParseResult, Schema } from "effect";

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

const decodeContentsSearchRequest = Schema.decodeUnknownEither(
  ContentsSearchRequestSchema,
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

const getExpectedRequiredValue = (
  property: CapabilityInputProperty,
): string => {
  if (property.pattern !== undefined && property.cliValueHint !== undefined) {
    return `a ${property.cliValueHint.slice(1, -1)} date string`;
  }

  return "a non-empty string";
};

type CollectedParseIssue = {
  readonly path: readonly PropertyKey[];
  readonly issue: ParseResult.ParseIssue;
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

  for (const property of contentsSearchInputProperties) {
    const matchingIssues = collectedIssues
      .filter((issue) => issue.path[0] === property.key)
      .map((issue) => issue.issue);

    if (matchingIssues.length > 0) {
      return {
        parameter: property.key as ContentsSearchInputKey,
        issues: matchingIssues,
      };
    }
  }

  return {
    parameter: undefined,
    issues: collectedIssues.map((issue) => issue.issue),
  };
};

const getParseIssueMessage = (
  issue: ParseResult.ParseIssue | undefined,
): string | undefined => {
  if (issue === undefined) {
    return undefined;
  }

  switch (issue._tag) {
    case "Type":
    case "Missing":
    case "Unexpected":
    case "Forbidden":
      return issue.message;
    default:
      return undefined;
  }
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
      expected: "an object with contents-search parameters",
      actual: input,
      message: "Contents-search input must be an object with semantic parameters.",
    });
  }

  const property = getContentsSearchInputProperty(parameter);
  const actual = input[parameter];

  if (issues.some((issue) => issue._tag === "Missing")) {
    return new InvalidContentsSearchRequest({
      code: "missing_parameter",
      parameter,
      reason: "required",
      expected: getExpectedRequiredValue(property),
      message: `Missing required parameter "${parameter}". Expected ${getExpectedRequiredValue(
        property,
      )}.`,
    });
  }

  if (property.enumValues !== undefined) {
    const choices = property.enumValues.filter(
      (value): value is string => typeof value === "string",
    );

    if (typeof actual !== "string") {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: `one of ${choices.join(", ")}`,
        actual,
        message: `Parameter "${parameter}" must be a string.`,
      });
    }

    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_choice",
      expected: `one of ${choices.join(", ")}`,
      actual,
      message: `Parameter "${parameter}" must be one of: ${choices.join(", ")}.`,
    });
  }

  if (property.type === "integer") {
    if (!Number.isInteger(actual)) {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "invalid_type",
        expected: "an integer",
        actual,
        message: `Parameter "${parameter}" must be an integer.`,
      });
    }

    if (
      typeof property.minimum === "number" &&
      typeof property.maximum === "number" &&
      typeof actual === "number" &&
      (actual < property.minimum || actual > property.maximum)
    ) {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "out_of_range",
        expected: `an integer between ${property.minimum} and ${property.maximum}`,
        actual,
        message: `Parameter "${parameter}" must be between ${property.minimum} and ${property.maximum}.`,
      });
    }
  }

  if (typeof actual !== "string") {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_type",
      expected: "a string",
      actual,
      message: `Parameter "${parameter}" must be a string.`,
    });
  }

  if (
    typeof property.minLength === "number" &&
    property.minLength > 0 &&
    actual.length < property.minLength
  ) {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "empty_string",
      expected: property.required
        ? getExpectedRequiredValue(property)
        : "a non-empty string",
      actual,
      message: `Parameter "${parameter}" must not be empty.`,
    });
  }

  if (property.pattern !== undefined) {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "invalid_format",
      expected: "YYYYMMDD",
      actual,
      message: `Parameter "${parameter}" must use YYYYMMDD format.`,
    });
  }

  const [issue] = issues;

  return new InvalidContentsSearchRequest({
    code: "invalid_parameter",
    parameter,
    reason: "invalid_parameter",
    actual,
    message:
      getParseIssueMessage(issue) === undefined
        ? `Parameter "${parameter}" is invalid.`
        : `Parameter "${parameter}" is invalid. ${getParseIssueMessage(issue)}`,
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
      expected: "an object with contents-search parameters",
      actual: input,
      message: "Contents-search input must be an object with semantic parameters.",
    });
  }

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

  const result = decodeContentsSearchRequest(input);

  if (result._tag === "Right") {
    return result.right;
  }

  throw toInvalidContentsSearchRequest(input, result.left);
};
