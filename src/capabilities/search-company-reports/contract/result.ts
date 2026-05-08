import { Schema } from "effect";

import { searchCompanyReportsSchemaCopy } from "../copy.ts";
import { SearchCompanyReportsRequestSchema } from "./request.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

export const SearchCompanyReportsCompanySchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  name: Schema.optional(Schema.String),
  marketLabel: Schema.optional(Schema.String),
});
export type SearchCompanyReportsCompany =
  typeof SearchCompanyReportsCompanySchema.Type;

export const SearchCompanyReportsFilingSchema = Schema.Struct({
  receiptNumber: Schema.String,
  reportTitle: Schema.String,
  receiptDate: Schema.String,
  presenterName: Schema.optional(Schema.String),
});
export type SearchCompanyReportsFiling =
  typeof SearchCompanyReportsFilingSchema.Type;

export const SearchCompanyReportsItemReferencesSchema = Schema.Struct({
  viewerUrl: Schema.String,
});
export type SearchCompanyReportsItemReferences =
  typeof SearchCompanyReportsItemReferencesSchema.Type;

export const SearchCompanyReportsRemarkSchema = Schema.Struct({
  text: Schema.String,
  title: Schema.optional(Schema.String),
});
export type SearchCompanyReportsRemark =
  typeof SearchCompanyReportsRemarkSchema.Type;

export const SearchCompanyReportsEvidenceSchema = Schema.Struct({
  rawRowText: Schema.String,
});
export type SearchCompanyReportsEvidence =
  typeof SearchCompanyReportsEvidenceSchema.Type;

export const SearchCompanyReportsItemSchema = Schema.Struct({
  company: SearchCompanyReportsCompanySchema,
  filing: SearchCompanyReportsFilingSchema,
  references: SearchCompanyReportsItemReferencesSchema,
  remarks: Schema.Array(SearchCompanyReportsRemarkSchema),
  evidence: SearchCompanyReportsEvidenceSchema,
});
export type SearchCompanyReportsItem =
  typeof SearchCompanyReportsItemSchema.Type;

export const SearchCompanyReportsPaginationSchema = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchCompanyReportsPagination =
  typeof SearchCompanyReportsPaginationSchema.Type;

export const SearchCompanyReportsMetadataSchema = Schema.Struct({
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("dsab007"),
    endpoint: Schema.String,
  }),
  sourceBehavior: Schema.Struct({
    searchMode: Schema.Literal("corp"),
    sortBy: Schema.Literal("date"),
    callerControlsPageSize: Schema.Literal(true),
    pageSizeChoices: Schema.Array(Schema.Literal(15, 30, 50, 100)),
    finalReportDefault: Schema.Literal(true),
    observationStatus: Schema.Literal("observed"),
  }),
  completeness: Schema.Literal("complete", "partial"),
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchCompanyReportsMetadata =
  typeof SearchCompanyReportsMetadataSchema.Type;

export const SearchCompanyReportsReferencesSchema = Schema.Struct({
  searchUrl: Schema.String,
});
export type SearchCompanyReportsReferences =
  typeof SearchCompanyReportsReferencesSchema.Type;

export const SearchCompanyReportsWarningSchema = Schema.Struct({
  code: Schema.Literal("partial_rows_dropped"),
  message: Schema.String,
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchCompanyReportsWarning =
  typeof SearchCompanyReportsWarningSchema.Type;

export const SearchCompanyReportsResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: SearchCompanyReportsRequestSchema,
    company: SearchCompanyReportsCompanySchema,
    pagination: SearchCompanyReportsPaginationSchema,
    items: Schema.Array(SearchCompanyReportsItemSchema),
  }),
  metadata: SearchCompanyReportsMetadataSchema,
  references: SearchCompanyReportsReferencesSchema,
  warnings: Schema.Array(SearchCompanyReportsWarningSchema),
}).annotations({
  identifier: "SearchCompanyReportsResult",
  description: searchCompanyReportsSchemaCopy.resultDescription,
});
export type SearchCompanyReportsResult =
  typeof SearchCompanyReportsResultSchema.Type;
