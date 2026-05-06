import { Schema } from "effect";

import { searchBodySchemaCopy } from "../copy.ts";
import { SearchBodyRequestSchema } from "./request.ts";

export const SearchBodyCompanySchema = Schema.Struct({
  name: Schema.String,
  marketLabel: Schema.optional(Schema.String),
  companyCode: Schema.optional(Schema.String),
});
export type SearchBodyCompany = typeof SearchBodyCompanySchema.Type;

export const SearchBodyFilingSchema = Schema.Struct({
  receiptNumber: Schema.String,
  documentNumber: Schema.optional(Schema.String),
  reportTitle: Schema.String,
  reportModifier: Schema.optional(Schema.String),
  reportPeriod: Schema.optional(Schema.String),
  reportNameSuffix: Schema.optional(Schema.String),
  receiptDate: Schema.String,
});
export type SearchBodyFiling = typeof SearchBodyFilingSchema.Type;

export const SearchBodyMatchSchema = Schema.Struct({
  snippetText: Schema.String,
  disclosureTypeLabel: Schema.optional(Schema.String),
  contentTypeLabel: Schema.optional(Schema.String),
  presenterName: Schema.optional(Schema.String),
});
export type SearchBodyMatch = typeof SearchBodyMatchSchema.Type;

export const SearchBodyItemReferencesSchema = Schema.Struct({
  viewerUrl: Schema.String,
});
export type SearchBodyItemReferences =
  typeof SearchBodyItemReferencesSchema.Type;

export const SearchBodyEvidenceSchema = Schema.Struct({
  reportNameRaw: Schema.String,
  rawInfoText: Schema.String,
  snippetHtml: Schema.String,
});
export type SearchBodyEvidence = typeof SearchBodyEvidenceSchema.Type;

export const SearchBodyItemSchema = Schema.Struct({
  company: SearchBodyCompanySchema,
  filing: SearchBodyFilingSchema,
  match: SearchBodyMatchSchema,
  references: SearchBodyItemReferencesSchema,
  evidence: SearchBodyEvidenceSchema,
});
export type SearchBodyItem = typeof SearchBodyItemSchema.Type;

export const SearchBodyPaginationSchema = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchBodyPagination =
  typeof SearchBodyPaginationSchema.Type;

export const SearchBodyMetadataSchema = Schema.Struct({
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
export type SearchBodyMetadata = typeof SearchBodyMetadataSchema.Type;

export const SearchBodyReferencesSchema = Schema.Struct({
  searchUrl: Schema.String,
});
export type SearchBodyReferences =
  typeof SearchBodyReferencesSchema.Type;

export const SearchBodyWarningSchema = Schema.Struct({
  code: Schema.Literal("partial_rows_dropped"),
  message: Schema.String,
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchBodyWarning = typeof SearchBodyWarningSchema.Type;

export const SearchBodyResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: SearchBodyRequestSchema,
    pagination: SearchBodyPaginationSchema,
    items: Schema.Array(SearchBodyItemSchema),
  }),
  metadata: SearchBodyMetadataSchema,
  references: SearchBodyReferencesSchema,
  warnings: Schema.Array(SearchBodyWarningSchema),
}).annotations({
  identifier: "SearchBodyResult",
  description: searchBodySchemaCopy.resultDescription,
});
export type SearchBodyResult = typeof SearchBodyResultSchema.Type;
