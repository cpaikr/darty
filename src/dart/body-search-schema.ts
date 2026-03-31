import { Schema } from "effect";

const DateString = Schema.String.pipe(
  Schema.pattern(/^\d{8}$/),
  Schema.annotations({
    identifier: "DateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const BodySearchSort = Schema.Literal("date", "reportName");
export type BodySearchSort = typeof BodySearchSort.Type;

export const BodySearchQuery = Schema.Struct({
  query: Schema.NonEmptyString,
  startDate: DateString,
  endDate: DateString,
  page: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  sort: BodySearchSort,
  companyName: Schema.optional(Schema.NonEmptyString),
  companyId: Schema.optional(Schema.NonEmptyString),
  presenterName: Schema.optional(Schema.NonEmptyString),
});
export type BodySearchQuery = typeof BodySearchQuery.Type;

export const FilingSearchHit = Schema.Struct({
  companyName: Schema.String,
  companyMarket: Schema.optional(Schema.String),
  corpId: Schema.optional(Schema.String),
  reportTitle: Schema.String,
  reportSubtitle: Schema.optional(Schema.String),
  reportModifier: Schema.optional(Schema.String),
  rcpNo: Schema.String,
  dcmNo: Schema.optional(Schema.String),
  snippetHtml: Schema.String,
  snippetText: Schema.String,
  disclosureCategory: Schema.optional(Schema.String),
  contentScope: Schema.optional(Schema.String),
  presenterName: Schema.optional(Schema.String),
  filedAt: Schema.String,
  viewerUrl: Schema.String,
});
export type FilingSearchHit = typeof FilingSearchHit.Type;

export const PaginationInfo = Schema.Struct({
  page: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  pageCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type PaginationInfo = typeof PaginationInfo.Type;

export const BodySearchResult = Schema.Struct({
  query: BodySearchQuery,
  pagination: PaginationInfo,
  results: Schema.Array(FilingSearchHit),
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type BodySearchResult = typeof BodySearchResult.Type;
