import { ParseResult, Schema } from "effect";

const datePattern = /^\d{8}$/;

type AnnotatableSchema<S> = S & {
  annotations: (
    annotations: Record<PropertyKey, unknown>,
  ) => S;
};

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S =>
  (schema as AnnotatableSchema<S>).annotations(annotations) as S;

const ContentsSearchDateString = annotateSchema(
  Schema.String.pipe(Schema.pattern(datePattern)),
  {
    identifier: "ContentsSearchDateString",
    description: "Date string in YYYYMMDD format.",
  },
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

const contentsSearchInputRules = {
  page: {
    kind: "integer",
    required: false,
    minimum: 1,
    maximum: 100,
    expectedRequiredValue: "an integer between 1 and 100",
  },
  sortBy: {
    kind: "enum",
    required: false,
    enumValues: contentsSearchSortByValues,
    expectedRequiredValue: `one of ${contentsSearchSortByValues.join(", ")}`,
  },
  sortDirection: {
    kind: "enum",
    required: false,
    enumValues: contentsSearchSortDirectionValues,
    expectedRequiredValue: `one of ${contentsSearchSortDirectionValues.join(", ")}`,
  },
  keyword: {
    kind: "string",
    required: true,
    nonEmpty: true,
    expectedRequiredValue: "a non-empty string",
  },
  startDate: {
    kind: "date",
    required: true,
    expectedRequiredValue: "a YYYYMMDD date string",
  },
  endDate: {
    kind: "date",
    required: true,
    expectedRequiredValue: "a YYYYMMDD date string",
  },
  companyCode: {
    kind: "string",
    required: false,
    nonEmpty: true,
    expectedRequiredValue: "a non-empty string",
  },
  presenterName: {
    kind: "string",
    required: false,
    nonEmpty: true,
    expectedRequiredValue: "a non-empty string",
  },
  reportName: {
    kind: "string",
    required: false,
    nonEmpty: true,
    expectedRequiredValue: "a non-empty string",
  },
} as const;

type ContentsSearchInputKey = keyof typeof contentsSearchInputRules;

const contentsSearchRequestFields = {
  page: annotateSchema(
    Schema.optionalWith(
      annotateSchema(
        Schema.Int.pipe(
          Schema.greaterThanOrEqualTo(1),
          Schema.lessThanOrEqualTo(100),
        ),
        {
          description: "1-based search results page to request.",
        },
      ),
      { default: () => defaultRequest.page },
    ),
    {
      default: defaultRequest.page,
    },
  ),
  sortBy: annotateSchema(
    Schema.optionalWith(
      annotateSchema(ContentsSearchSortBySchema, {
        description: "Sort field for results.",
      }),
      {
        default: () => defaultRequest.sortBy,
      },
    ),
    {
      default: defaultRequest.sortBy,
    },
  ),
  sortDirection: annotateSchema(
    Schema.optionalWith(
      annotateSchema(ContentsSearchSortDirectionSchema, {
        description: "Sort direction for the selected sort field.",
      }),
      {
        default: () => defaultRequest.sortDirection,
      },
    ),
    {
      default: defaultRequest.sortDirection,
    },
  ),
  keyword: annotateSchema(Schema.NonEmptyString, {
    description: "Main body-content search text.",
  }),
  startDate: annotateSchema(ContentsSearchDateString, {
    description: "Inclusive receipt start date in YYYYMMDD format.",
  }),
  endDate: annotateSchema(ContentsSearchDateString, {
    description: "Inclusive receipt end date in YYYYMMDD format.",
  }),
  companyCode: Schema.optional(
    annotateSchema(Schema.NonEmptyString, {
      description: "Filter by DART company code.",
    }),
  ),
  presenterName: Schema.optional(
    annotateSchema(Schema.NonEmptyString, {
      description: "Filter by presenter name when DART exposes that field.",
    }),
  ),
  reportName: Schema.optional(
    annotateSchema(Schema.NonEmptyString, {
      description: "Filter by report title as currently honored by DART.",
    }),
  ),
} as const;

export const ContentsSearchRequestSchema = Schema.Struct(
  contentsSearchRequestFields,
).annotations({
  identifier: "ContentsSearchRequest",
  description: "Public semantic input contract for `contents-search`.",
});

export type ContentsSearchRawInput = typeof ContentsSearchRequestSchema.Encoded;
export type ContentsSearchRequest = typeof ContentsSearchRequestSchema.Type;

const decodeContentsSearchRequest = Schema.decodeUnknownEither(
  ContentsSearchRequestSchema,
);

export const ContentsSearchCompanySchema = Schema.Struct({
  name: Schema.String,
  marketLabel: Schema.optional(Schema.String),
  companyCode: Schema.optional(Schema.String),
});
export type ContentsSearchCompany = typeof ContentsSearchCompanySchema.Type;

export const ContentsSearchFilingSchema = Schema.Struct({
  receiptNumber: Schema.String,
  documentNumber: Schema.optional(Schema.String),
  reportTitle: Schema.String,
  reportModifier: Schema.optional(Schema.String),
  reportPeriod: Schema.optional(Schema.String),
  reportNameSuffix: Schema.optional(Schema.String),
  receiptDate: Schema.String,
});
export type ContentsSearchFiling = typeof ContentsSearchFilingSchema.Type;

export const ContentsSearchMatchSchema = Schema.Struct({
  snippetText: Schema.String,
  disclosureTypeLabel: Schema.optional(Schema.String),
  contentTypeLabel: Schema.optional(Schema.String),
  presenterName: Schema.optional(Schema.String),
});
export type ContentsSearchMatch = typeof ContentsSearchMatchSchema.Type;

export const ContentsSearchItemReferencesSchema = Schema.Struct({
  viewerUrl: Schema.String,
});
export type ContentsSearchItemReferences =
  typeof ContentsSearchItemReferencesSchema.Type;

export const ContentsSearchEvidenceSchema = Schema.Struct({
  reportNameRaw: Schema.String,
  rawInfoText: Schema.String,
  snippetHtml: Schema.String,
});
export type ContentsSearchEvidence = typeof ContentsSearchEvidenceSchema.Type;

export const ContentsSearchItemSchema = Schema.Struct({
  company: ContentsSearchCompanySchema,
  filing: ContentsSearchFilingSchema,
  match: ContentsSearchMatchSchema,
  references: ContentsSearchItemReferencesSchema,
  evidence: ContentsSearchEvidenceSchema,
});
export type ContentsSearchItem = typeof ContentsSearchItemSchema.Type;

export const ContentsSearchPaginationSchema = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type ContentsSearchPagination =
  typeof ContentsSearchPaginationSchema.Type;

export const ContentsSearchMetadataSchema = Schema.Struct({
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("dsab007"),
    endpoint: Schema.String,
  }),
  sourceBehavior: Schema.Struct({
    effectivePageSize: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    effectivePagerWidth: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    callerControlsPageSize: Schema.Literal(false),
    callerControlsPagerWidth: Schema.Literal(false),
    observationStatus: Schema.Literal("observed"),
  }),
  completeness: Schema.Literal("complete", "partial"),
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type ContentsSearchMetadata = typeof ContentsSearchMetadataSchema.Type;

export const ContentsSearchReferencesSchema = Schema.Struct({
  searchUrl: Schema.String,
});
export type ContentsSearchReferences =
  typeof ContentsSearchReferencesSchema.Type;

export const ContentsSearchWarningSchema = Schema.Struct({
  code: Schema.Literal("partial_rows_dropped"),
  message: Schema.String,
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type ContentsSearchWarning = typeof ContentsSearchWarningSchema.Type;

export const ContentsSearchResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: ContentsSearchRequestSchema,
    pagination: ContentsSearchPaginationSchema,
    items: Schema.Array(ContentsSearchItemSchema),
  }),
  metadata: ContentsSearchMetadataSchema,
  references: ContentsSearchReferencesSchema,
  warnings: Schema.Array(ContentsSearchWarningSchema),
}).annotations({
  identifier: "ContentsSearchResult",
  description: "Successful contents-search result envelope.",
});
export type ContentsSearchResult = typeof ContentsSearchResultSchema.Type;

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

const allowedKeys = new Set<string>(Object.keys(contentsSearchInputRules));
const orderedInputKeys = Object.keys(
  contentsSearchInputRules,
) as readonly ContentsSearchInputKey[];

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

  const rule = contentsSearchInputRules[parameter];
  const actual = input[parameter];

  if (issues.some((issue) => issue._tag === "Missing")) {
    return new InvalidContentsSearchRequest({
      code: "missing_parameter",
      parameter,
      reason: "required",
      expected: rule.expectedRequiredValue,
      message: `Missing required parameter "${parameter}". Expected ${rule.expectedRequiredValue}.`,
    });
  }

  if (rule.kind === "enum") {
    const choices = [...rule.enumValues];

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

  if (rule.kind === "integer") {
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

    const numericActual = actual as number;

    if (numericActual < rule.minimum || numericActual > rule.maximum) {
      return new InvalidContentsSearchRequest({
        code: "invalid_parameter",
        parameter,
        reason: "out_of_range",
        expected: `an integer between ${rule.minimum} and ${rule.maximum}`,
        actual: numericActual,
        message: `Parameter "${parameter}" must be between ${rule.minimum} and ${rule.maximum}.`,
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

  if (rule.kind === "string" && rule.nonEmpty && actual.length === 0) {
    return new InvalidContentsSearchRequest({
      code: "invalid_parameter",
      parameter,
      reason: "empty_string",
      expected: "a non-empty string",
      actual,
      message: `Parameter "${parameter}" must not be empty.`,
    });
  }

  if (rule.kind === "date") {
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
