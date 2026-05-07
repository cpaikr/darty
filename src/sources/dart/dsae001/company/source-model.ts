import { Schema } from "effect";

import { SourceCompanyReplayInput } from "./replay-schema.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));
const ListedStockCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{6}$/));

export const SourceCompanyMarketKind = Schema.Literal(
  "kospi",
  "kosdaq",
  "konex",
  "etc",
  "unknown",
);
export type SourceCompanyMarketKind = typeof SourceCompanyMarketKind.Type;

export const SourceCompanyRow = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: Schema.NonEmptyString,
  stockCode: Schema.optional(ListedStockCodeSchema),
  marketKind: SourceCompanyMarketKind,
  marketLabel: Schema.optional(Schema.String),
  rawCompanyLinkHref: Schema.String,
  rawMarketBadgeText: Schema.optional(Schema.String),
});
export type SourceCompanyRow = typeof SourceCompanyRow.Type;

export const SourceCompanyPagination = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SourceCompanyPagination = typeof SourceCompanyPagination.Type;

export const SourceCompanyParseWarning = Schema.Struct({
  code: Schema.Literal("row_parse_failed"),
  rowIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  message: Schema.String,
});
export type SourceCompanyParseWarning = typeof SourceCompanyParseWarning.Type;

export const SourceCompanySearchPage = Schema.Struct({
  request: SourceCompanyReplayInput,
  pagination: SourceCompanyPagination,
  rows: Schema.Array(SourceCompanyRow),
  warnings: Schema.Array(SourceCompanyParseWarning),
  droppedRowCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type SourceCompanySearchPage = typeof SourceCompanySearchPage.Type;
