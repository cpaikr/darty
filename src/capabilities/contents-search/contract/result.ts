import { Schema } from "effect";

import { contentsSearchSchemaCopy } from "../copy.ts";
import { ContentsSearchRequestSchema } from "./request.ts";

export const ContentsSearchCompanySchema = Schema.Struct({
  name: Schema.String,
  marketLabel: Schema.optional(Schema.String),
  companyCode: Schema.optional(Schema.String),
});
export type ContentsSearchCompany = typeof ContentsSearchCompanySchema.Type;

export const ContentsSearchFilingSchema = Schema.Struct({
  receiptNumber: Schema.String,
  documentNumber: Schema.optional(Schema.String),
  reportTitle: Schema.String,
  reportModifier: Schema.optional(Schema.String),
  reportPeriod: Schema.optional(Schema.String),
  reportNameSuffix: Schema.optional(Schema.String),
  receiptDate: Schema.String,
});
export type ContentsSearchFiling = typeof ContentsSearchFilingSchema.Type;

export const ContentsSearchMatchSchema = Schema.Struct({
  snippetText: Schema.String,
  disclosureTypeLabel: Schema.optional(Schema.String),
  contentTypeLabel: Schema.optional(Schema.String),
  presenterName: Schema.optional(Schema.String),
});
export type ContentsSearchMatch = typeof ContentsSearchMatchSchema.Type;

export const ContentsSearchItemReferencesSchema = Schema.Struct({
  viewerUrl: Schema.String,
});
export type ContentsSearchItemReferences =
  typeof ContentsSearchItemReferencesSchema.Type;

export const ContentsSearchEvidenceSchema = Schema.Struct({
  reportNameRaw: Schema.String,
  rawInfoText: Schema.String,
  snippetHtml: Schema.String,
});
export type ContentsSearchEvidence = typeof ContentsSearchEvidenceSchema.Type;

export const ContentsSearchItemSchema = Schema.Struct({
  company: ContentsSearchCompanySchema,
  filing: ContentsSearchFilingSchema,
  match: ContentsSearchMatchSchema,
  references: ContentsSearchItemReferencesSchema,
  evidence: ContentsSearchEvidenceSchema,
});
export type ContentsSearchItem = typeof ContentsSearchItemSchema.Type;

export const ContentsSearchPaginationSchema = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type ContentsSearchPagination =
  typeof ContentsSearchPaginationSchema.Type;

export const ContentsSearchMetadataSchema = Schema.Struct({
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("dsab007"),
    endpoint: Schema.String,
  }),
  sourceBehavior: Schema.Struct({
    effectivePageSize: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    effectivePagerWidth: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    callerControlsPageSize: Schema.Literal(false),
    callerControlsPagerWidth: Schema.Literal(false),
    observationStatus: Schema.Literal("observed"),
  }),
  completeness: Schema.Literal("complete", "partial"),
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type ContentsSearchMetadata = typeof ContentsSearchMetadataSchema.Type;

export const ContentsSearchReferencesSchema = Schema.Struct({
  searchUrl: Schema.String,
});
export type ContentsSearchReferences =
  typeof ContentsSearchReferencesSchema.Type;

export const ContentsSearchWarningSchema = Schema.Struct({
  code: Schema.Literal("partial_rows_dropped"),
  message: Schema.String,
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type ContentsSearchWarning = typeof ContentsSearchWarningSchema.Type;

export const ContentsSearchResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: ContentsSearchRequestSchema,
    pagination: ContentsSearchPaginationSchema,
    items: Schema.Array(ContentsSearchItemSchema),
  }),
  metadata: ContentsSearchMetadataSchema,
  references: ContentsSearchReferencesSchema,
  warnings: Schema.Array(ContentsSearchWarningSchema),
}).annotations({
  identifier: "ContentsSearchResult",
  description: contentsSearchSchemaCopy.resultDescription,
});
export type ContentsSearchResult = typeof ContentsSearchResultSchema.Type;
