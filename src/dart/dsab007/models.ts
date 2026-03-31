import { Schema } from "effect";
import { Dsab007ContentsSearchInput } from "./contracts.ts";

/**
 * Parsed row model for the current `dsab007` contents mode.
 *
 * This keeps DART-facing details such as `corpCik`, `viewerPath`, and the raw
 * report-name text instead of flattening everything into an early semantic shape.
 */
export const Dsab007ContentsRow = Schema.Struct({
  companyName: Schema.String,
  companyMarketLabel: Schema.optional(Schema.String),
  corpCik: Schema.optional(Schema.String),
  reportNameRaw: Schema.String,
  reportModifier: Schema.optional(Schema.String),
  reportTitle: Schema.String,
  reportPeriod: Schema.optional(Schema.String),
  reportNameSuffix: Schema.optional(Schema.String),
  rcpNo: Schema.String,
  dcmNo: Schema.optional(Schema.String),
  snippetHtml: Schema.String,
  snippetText: Schema.String,
  disclosureTypeLabel: Schema.optional(Schema.String),
  contentTypeLabel: Schema.optional(Schema.String),
  presenterName: Schema.optional(Schema.String),
  rawInfoText: Schema.String,
  viewerPath: Schema.String,
  viewerUrl: Schema.String,
  receiptDate: Schema.String,
});
export type Dsab007ContentsRow = typeof Dsab007ContentsRow.Type;

export const Dsab007Pagination = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type Dsab007Pagination = typeof Dsab007Pagination.Type;

/**
 * Result envelope for a single `dsab007` contents replay.
 *
 * The original request is included so callers can compare requested paging and
 * sorting with what DART actually returned.
 */
export const Dsab007ContentsSearchResult = Schema.Struct({
  request: Dsab007ContentsSearchInput,
  pagination: Dsab007Pagination,
  rows: Schema.Array(Dsab007ContentsRow),
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type Dsab007ContentsSearchResult = typeof Dsab007ContentsSearchResult.Type;
