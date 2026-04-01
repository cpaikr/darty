import { Option, Schema, SchemaAST } from "effect";

const DateString = Schema.String.pipe(
  Schema.pattern(/^\d{8}$/),
  Schema.annotations({
    identifier: "DateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const Dsab007Option = Schema.Literal("contents");
export type Dsab007Option = typeof Dsab007Option.Type;

/**
 * Observed in live `/dsab007/search.ax` contents fragments on 2026-03-31:
 * `clickSort(this, 'DATE')` and `clickSort(this, 'rpt_nm')`.
 */
export const dsab007ContentsSortFields = ["DATE", "rpt_nm"] as const;
export const Dsab007ContentsSortField = Schema.Literal(
  ...dsab007ContentsSortFields,
);
export type Dsab007ContentsSortField = typeof Dsab007ContentsSortField.Type;

/**
 * Observed in live `/dsab007/search.ax` contents fragments on 2026-03-31:
 * active sort anchors render `오름차순`/`내림차순`, matching `asc`/`desc`.
 */
export const dsab007ContentsSortDirections = ["asc", "desc"] as const;
export const Dsab007ContentsSortDirection = Schema.Literal(
  ...dsab007ContentsSortDirections,
);
export type Dsab007ContentsSortDirection =
  typeof Dsab007ContentsSortDirection.Type;

type CliFlag = `--${string}`;
type ParameterAlias = string;

export type Dsab007ContentsSearchParameterStatus =
  | "observed"
  | "inferred"
  | "unverified";

export type Dsab007ContentsSearchParameterMetadata = {
  readonly description: string;
  readonly aliases?: readonly ParameterAlias[];
  readonly valueHint?: string;
  readonly status?: Dsab007ContentsSearchParameterStatus;
};

export type Dsab007ContentsSearchParameterDoc =
  Dsab007ContentsSearchParameterMetadata & {
    readonly key: string;
    readonly aliases: readonly ParameterAlias[];
    readonly cliFlags: readonly CliFlag[];
    readonly status: Dsab007ContentsSearchParameterStatus;
  };

const dsab007ContentsSearchParameterMetadataAnnotationId = Symbol.for(
  "darty/dsab007/contents/parameterMetadata",
);

type AnnotatableParameter<S> = S & {
  annotations: (
    annotations: Record<PropertyKey, unknown>,
  ) => S;
};

const annotateParameter = <S>(
  schema: S,
  metadata: Dsab007ContentsSearchParameterMetadata,
): S =>
  (schema as AnnotatableParameter<S>).annotations({
    description: metadata.description,
    [dsab007ContentsSearchParameterMetadataAnnotationId]: metadata,
  }) as S;

const dsab007ContentsSearchFields = {
  option: annotateParameter(Dsab007Option, {
    description: "DART search mode. Fixed to `contents` for this command.",
    status: "observed",
  }),
  currentPage: annotateParameter(
    Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
    {
      aliases: ["page", "current-page"],
      valueHint: "<number>",
      description: "1-based search results page to request.",
      status: "observed",
    },
  ),
  maxResults: annotateParameter(
    Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(100),
    ),
    {
      aliases: ["limit", "max-results"],
      valueHint: "<number>",
      description: "Requested result count per page.",
      status: "observed",
    },
  ),
  maxLinks: annotateParameter(
    Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(100),
    ),
    {
      aliases: ["max-links"],
      valueHint: "<number>",
      description: "Requested number of pagination links in the DART pager.",
      status: "observed",
    },
  ),
  sort: annotateParameter(Dsab007ContentsSortField, {
    aliases: ["sort"],
    valueHint: `<${dsab007ContentsSortFields.join("|")}>`,
    description: "Sort field for results.",
    status: "observed",
  }),
  sortType: annotateParameter(Dsab007ContentsSortDirection, {
    aliases: ["sort-direction", "sort-type"],
    valueHint: `<${dsab007ContentsSortDirections.join("|")}>`,
    description: "Sort direction for the selected sort field.",
    status: "observed",
  }),
  keyword: annotateParameter(Schema.NonEmptyString, {
    aliases: ["keyword", "query"],
    valueHint: "<text>",
    description: "Main body-content search text.",
    status: "observed",
  }),
  startDate: annotateParameter(DateString, {
    aliases: ["start-date"],
    valueHint: "<YYYYMMDD>",
    description: "Inclusive receipt start date in YYYYMMDD format.",
    status: "observed",
  }),
  endDate: annotateParameter(DateString, {
    aliases: ["end-date"],
    valueHint: "<YYYYMMDD>",
    description: "Inclusive receipt end date in YYYYMMDD format.",
    status: "observed",
  }),
  textCrpCik: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["company-code", "text-crp-cik"],
    valueHint: "<text>",
    description: "Filter by DART company code.",
    status: "observed",
  }),
  textCrpNm: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["company-name", "text-crp-nm"],
    valueHint: "<text>",
    description: "Filter by company name as shown in DART search.",
    status: "observed",
  }),
  textPresenterNm: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["presenter-name", "text-presenter-nm"],
    valueHint: "<text>",
    description: "Filter by presenter name when DART exposes that field.",
    status: "observed",
  }),
  lateKeyword: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["late-keyword"],
    valueHint: "<text>",
    description: "Secondary keyword field sent to DART.",
    status: "inferred",
  }),
  flrCik: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["filer-code", "flr-cik"],
    valueHint: "<text>",
    description: "Filer-code filter sent to DART.",
    status: "inferred",
  }),
  dspTypeTab: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["disclosure-type-tab", "dsp-type-tab"],
    valueHint: "<text>",
    description: "Disclosure-type tab selector sent to DART.",
    status: "inferred",
  }),
  tocSrch: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["toc-search", "toc-srch"],
    valueHint: "<text>",
    description: "Table-of-contents search toggle or mode field.",
    status: "inferred",
  }),
  docType: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["document-type", "doc-type"],
    valueHint: "<text>",
    description: "Document type filter label or code sent to DART.",
    status: "inferred",
  }),
  reportName: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["report-name"],
    valueHint: "<text>",
    description: "Report-name filter sent to DART.",
    status: "observed",
  }),
  decadeType: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["decade-type"],
    valueHint: "<text>",
    description: "Date-grouping selector sent to DART.",
    status: "inferred",
  }),
} as const;

/**
 * Low-level request contract for the implemented `dsab007` contents mode.
 *
 * This intentionally stays close to DART field names so other `dsab007` modes can
 * share the same execution core. Callers should treat this as a replay contract,
 * not as a guarantee that DART will honor every supplied field exactly.
 */
export const Dsab007ContentsSearchInput = Schema.Struct(
  dsab007ContentsSearchFields,
).annotations({
  identifier: "Dsab007ContentsSearchInput",
  description:
    "Low-level replay contract for the implemented `dsab007` contents mode.",
});
export type Dsab007ContentsSearchInput = typeof Dsab007ContentsSearchInput.Type;

const getParameterMetadata = (
  annotated: SchemaAST.Annotated,
): Dsab007ContentsSearchParameterMetadata | undefined =>
  Option.getOrUndefined(
    SchemaAST.getAnnotation<Dsab007ContentsSearchParameterMetadata>(
      annotated,
      dsab007ContentsSearchParameterMetadataAnnotationId,
    ),
  );

const getParameterDescription = (property: SchemaAST.PropertySignature): string =>
  Option.getOrElse(
    SchemaAST.getDescriptionAnnotation(property),
    () =>
      Option.getOrElse(
        SchemaAST.getDescriptionAnnotation(property.type),
        () => "Undocumented parameter.",
      ),
  );

export const describeDsab007ContentsSearchInput =
  (): readonly Dsab007ContentsSearchParameterDoc[] =>
    SchemaAST.getPropertySignatures(Dsab007ContentsSearchInput.ast).map(
      (property) => {
        const metadata =
          getParameterMetadata(property) ?? getParameterMetadata(property.type);

        if (metadata === undefined) {
          throw new Error(
            `Missing parameter metadata for "${String(property.name)}".`,
          );
        }

        return {
          ...metadata,
          key: String(property.name),
          description: getParameterDescription(property),
          aliases: metadata.aliases ?? [],
          cliFlags: (metadata.aliases ?? []).map(
            (alias) => `--${alias}` as const,
          ),
          status: metadata.status ?? "observed",
        };
      },
    );
