import { Schema } from "effect";

const DateString = Schema.String.pipe(
  Schema.pattern(/^\d{8}$/),
  Schema.annotations({
    identifier: "DateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const Dsab007Option = Schema.Literal("contents");
export type Dsab007Option = typeof Dsab007Option.Type;

export const Dsab007SortField = Schema.Literal("DATE", "rpt_nm");
export type Dsab007SortField = typeof Dsab007SortField.Type;

export const Dsab007SortDirection = Schema.Literal("asc", "desc");
export type Dsab007SortDirection = typeof Dsab007SortDirection.Type;

export const Dsab007ContentsSearchInput = Schema.Struct({
  option: Dsab007Option,
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  maxResults: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  maxLinks: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  sort: Dsab007SortField,
  sortType: Dsab007SortDirection,
  keyword: Schema.NonEmptyString,
  startDate: DateString,
  endDate: DateString,
  textCrpCik: Schema.optional(Schema.NonEmptyString),
  textCrpNm: Schema.optional(Schema.NonEmptyString),
  textPresenterNm: Schema.optional(Schema.NonEmptyString),
  lateKeyword: Schema.optional(Schema.NonEmptyString),
  flrCik: Schema.optional(Schema.NonEmptyString),
  dspTypeTab: Schema.optional(Schema.NonEmptyString),
  tocSrch: Schema.optional(Schema.NonEmptyString),
  docType: Schema.optional(Schema.NonEmptyString),
  reportName: Schema.optional(Schema.NonEmptyString),
  decadeType: Schema.optional(Schema.NonEmptyString),
});
export type Dsab007ContentsSearchInput = typeof Dsab007ContentsSearchInput.Type;
