import { Schema } from "effect";

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

const sourceContentsReplayFields = {
  option: SourceContentsOption.annotations({
    description: "DART search mode. Fixed to `contents` for this adapter.",
  }),
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)).annotations({
    description: "1-based results page sent to DART.",
  }),
  maxResults: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ).annotations({
    description: "Requested result count per page sent to DART.",
  }),
  maxLinks: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ).annotations({
    description: "Requested pager width sent to DART.",
  }),
  sort: SourceContentsSortField.annotations({
    description: "Sort field for the replay request.",
  }),
  sortType: SourceContentsSortDirection.annotations({
    description: "Sort direction for the replay request.",
  }),
  keyword: Schema.NonEmptyString.annotations({
    description: "Main body-content search text.",
  }),
  startDate: DateString.annotations({
    description: "Inclusive receipt start date.",
  }),
  endDate: DateString.annotations({
    description: "Inclusive receipt end date.",
  }),
  textCrpCik: Schema.optional(Schema.NonEmptyString).annotations({
    description: "Company code field sent to DART.",
  }),
  textCrpNm: Schema.optional(Schema.NonEmptyString).annotations({
    description: "Company name field sent to DART.",
  }),
  textPresenterNm: Schema.optional(Schema.NonEmptyString).annotations({
    description: "Presenter-name field sent to DART.",
  }),
  reportName: Schema.optional(Schema.NonEmptyString).annotations({
    description: "Report-name field sent to DART.",
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
