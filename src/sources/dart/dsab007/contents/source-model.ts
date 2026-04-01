import { Schema } from "effect";

import { SourceContentsReplayInput } from "./replay-schema.ts";

export const SourceContentsRow = Schema.Struct({
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
export type SourceContentsRow = typeof SourceContentsRow.Type;

export const SourceContentsPagination = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SourceContentsPagination = typeof SourceContentsPagination.Type;

export const SourceContentsParseWarning = Schema.Struct({
  code: Schema.Literal("row_parse_failed"),
  rowIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  message: Schema.String,
});
export type SourceContentsParseWarning =
  typeof SourceContentsParseWarning.Type;

export const SourceContentsSearchPage = Schema.Struct({
  request: SourceContentsReplayInput,
  pagination: SourceContentsPagination,
  rows: Schema.Array(SourceContentsRow),
  warnings: Schema.Array(SourceContentsParseWarning),
  droppedRowCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type SourceContentsSearchPage = typeof SourceContentsSearchPage.Type;
