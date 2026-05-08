import { Schema } from "effect";

import { SourceCompanyReportsReplayInput } from "./replay-schema.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

export const SourceCompanyReportsCompany = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  name: Schema.optional(Schema.String),
  marketLabel: Schema.optional(Schema.String),
});
export type SourceCompanyReportsCompany =
  typeof SourceCompanyReportsCompany.Type;

export const SourceCompanyReportsRemark = Schema.Struct({
  text: Schema.String,
  title: Schema.optional(Schema.String),
});
export type SourceCompanyReportsRemark =
  typeof SourceCompanyReportsRemark.Type;

export const SourceCompanyReportsRow = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: Schema.String,
  companyMarketLabel: Schema.optional(Schema.String),
  reportTitle: Schema.String,
  rcpNo: Schema.String,
  presenterName: Schema.optional(Schema.String),
  receiptDate: Schema.String,
  viewerPath: Schema.String,
  viewerUrl: Schema.String,
  remarks: Schema.Array(SourceCompanyReportsRemark),
  rawRowText: Schema.String,
});
export type SourceCompanyReportsRow = typeof SourceCompanyReportsRow.Type;

export const SourceCompanyReportsPagination = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SourceCompanyReportsPagination =
  typeof SourceCompanyReportsPagination.Type;

export const SourceCompanyReportsParseWarning = Schema.Struct({
  code: Schema.Literal("row_parse_failed"),
  rowIndex: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  message: Schema.String,
});
export type SourceCompanyReportsParseWarning =
  typeof SourceCompanyReportsParseWarning.Type;

export const SourceCompanyReportsSearchPage = Schema.Struct({
  request: SourceCompanyReportsReplayInput,
  company: SourceCompanyReportsCompany,
  pagination: SourceCompanyReportsPagination,
  rows: Schema.Array(SourceCompanyReportsRow),
  warnings: Schema.Array(SourceCompanyReportsParseWarning),
  droppedRowCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type SourceCompanyReportsSearchPage =
  typeof SourceCompanyReportsSearchPage.Type;
