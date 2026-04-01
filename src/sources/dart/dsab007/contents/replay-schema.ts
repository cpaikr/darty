import { Option, Schema, SchemaAST } from "effect";

const DateString = Schema.String.pipe(
  Schema.pattern(/^\d{8}$/),
  Schema.annotations({
    identifier: "DateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const SourceContentsOption = Schema.Literal("contents");
export type SourceContentsOption = typeof SourceContentsOption.Type;

export const sourceContentsSortFields = ["DATE", "rpt_nm"] as const;
export const SourceContentsSortField = Schema.Literal(
  ...sourceContentsSortFields,
);
export type SourceContentsSortField = typeof SourceContentsSortField.Type;

export const sourceContentsSortDirections = ["asc", "desc"] as const;
export const SourceContentsSortDirection = Schema.Literal(
  ...sourceContentsSortDirections,
);
export type SourceContentsSortDirection =
  typeof SourceContentsSortDirection.Type;

type CliFlag = `--${string}`;
type ParameterAlias = string;

export type SourceParameterStatus =
  | "observed"
  | "inferred"
  | "unverified";

export type SourceParameterMetadata = {
  readonly description: string;
  readonly aliases?: readonly ParameterAlias[];
  readonly valueHint?: string;
  readonly status?: SourceParameterStatus;
};

export type SourceParameterDoc =
  SourceParameterMetadata & {
    readonly key: string;
    readonly aliases: readonly ParameterAlias[];
    readonly cliFlags: readonly CliFlag[];
    readonly status: SourceParameterStatus;
  };

const sourceParameterMetadataAnnotationId = Symbol.for(
  "darty/source/dart/dsab007/contents/parameterMetadata",
);

type AnnotatableParameter<S> = S & {
  annotations: (
    annotations: Record<PropertyKey, unknown>,
  ) => S;
};

const annotateParameter = <S>(
  schema: S,
  metadata: SourceParameterMetadata,
): S =>
  (schema as AnnotatableParameter<S>).annotations({
    description: metadata.description,
    [sourceParameterMetadataAnnotationId]: metadata,
  }) as S;

const sourceContentsReplayFields = {
  option: annotateParameter(SourceContentsOption, {
    description: "DART search mode. Fixed to `contents` for this adapter.",
    status: "observed",
  }),
  currentPage: annotateParameter(
    Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
    {
      aliases: ["current-page"],
      valueHint: "<number>",
      description: "1-based results page sent to DART.",
      status: "observed",
    },
  ),
  maxResults: annotateParameter(
    Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(100),
    ),
    {
      aliases: ["max-results"],
      valueHint: "<number>",
      description: "Requested result count per page sent to DART.",
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
      description: "Requested pager width sent to DART.",
      status: "observed",
    },
  ),
  sort: annotateParameter(SourceContentsSortField, {
    aliases: ["sort"],
    valueHint: `<${sourceContentsSortFields.join("|")}>`,
    description: "Sort field for the replay request.",
    status: "observed",
  }),
  sortType: annotateParameter(SourceContentsSortDirection, {
    aliases: ["sort-type"],
    valueHint: `<${sourceContentsSortDirections.join("|")}>`,
    description: "Sort direction for the replay request.",
    status: "observed",
  }),
  keyword: annotateParameter(Schema.NonEmptyString, {
    aliases: ["keyword"],
    valueHint: "<text>",
    description: "Main body-content search text.",
    status: "observed",
  }),
  startDate: annotateParameter(DateString, {
    aliases: ["start-date"],
    valueHint: "<YYYYMMDD>",
    description: "Inclusive receipt start date.",
    status: "observed",
  }),
  endDate: annotateParameter(DateString, {
    aliases: ["end-date"],
    valueHint: "<YYYYMMDD>",
    description: "Inclusive receipt end date.",
    status: "observed",
  }),
  textCrpCik: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["text-crp-cik"],
    valueHint: "<text>",
    description: "Company code field sent to DART.",
    status: "observed",
  }),
  textCrpNm: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["text-crp-nm"],
    valueHint: "<text>",
    description: "Company name field sent to DART.",
    status: "observed",
  }),
  textPresenterNm: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["text-presenter-nm"],
    valueHint: "<text>",
    description: "Presenter-name field sent to DART.",
    status: "observed",
  }),
  lateKeyword: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["late-keyword"],
    valueHint: "<text>",
    description: "Secondary keyword field sent to DART.",
    status: "inferred",
  }),
  flrCik: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["flr-cik"],
    valueHint: "<text>",
    description: "Filer-code field sent to DART.",
    status: "inferred",
  }),
  dspTypeTab: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["dsp-type-tab"],
    valueHint: "<text>",
    description: "Disclosure-type tab field sent to DART.",
    status: "inferred",
  }),
  tocSrch: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["toc-srch"],
    valueHint: "<text>",
    description: "TOC search field sent to DART.",
    status: "inferred",
  }),
  docType: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["doc-type"],
    valueHint: "<text>",
    description: "Document-type field sent to DART.",
    status: "inferred",
  }),
  reportName: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["report-name"],
    valueHint: "<text>",
    description: "Report-name field sent to DART.",
    status: "observed",
  }),
  decadeType: annotateParameter(Schema.optional(Schema.NonEmptyString), {
    aliases: ["decade-type"],
    valueHint: "<text>",
    description: "Date-grouping selector sent to DART.",
    status: "inferred",
  }),
} as const;

export const SourceContentsReplayInput = Schema.Struct(
  sourceContentsReplayFields,
).annotations({
  identifier: "SourceContentsReplayInput",
  description:
    "Low-level DART replay contract for `dsab007` contents search.",
});
export type SourceContentsReplayInput = typeof SourceContentsReplayInput.Type;

const getParameterMetadata = (
  annotated: SchemaAST.Annotated,
): SourceParameterMetadata | undefined =>
  Option.getOrUndefined(
    SchemaAST.getAnnotation<SourceParameterMetadata>(
      annotated,
      sourceParameterMetadataAnnotationId,
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

export const describeSourceContentsReplayInput =
  (): readonly SourceParameterDoc[] =>
    SchemaAST.getPropertySignatures(SourceContentsReplayInput.ast).map(
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
