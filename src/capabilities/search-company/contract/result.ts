import { Schema } from "effect";

import { searchCompanySchemaCopy } from "../copy.ts";
import { SearchCompanyRequestSchema } from "./request.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));
const ListedStockCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{6}$/));

export const SearchCompanyMarketKindSchema = Schema.Literal(
  "kospi",
  "kosdaq",
  "konex",
  "etc",
  "unknown",
);
export type SearchCompanyMarketKind =
  typeof SearchCompanyMarketKindSchema.Type;

export const SearchCompanyItemReferencesSchema = Schema.Struct({
  detailEndpoint: Schema.String,
});
export type SearchCompanyItemReferences =
  typeof SearchCompanyItemReferencesSchema.Type;

export const SearchCompanyItemEvidenceSchema = Schema.Struct({
  rawCompanyLinkHref: Schema.String,
  rawMarketBadgeText: Schema.optional(Schema.String),
});
export type SearchCompanyItemEvidence =
  typeof SearchCompanyItemEvidenceSchema.Type;

export const SearchCompanyItemSchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: Schema.String,
  stockCode: Schema.optional(ListedStockCodeSchema),
  marketKind: SearchCompanyMarketKindSchema,
  marketLabel: Schema.optional(Schema.String),
  references: SearchCompanyItemReferencesSchema,
  evidence: SearchCompanyItemEvidenceSchema,
});
export type SearchCompanyItem = typeof SearchCompanyItemSchema.Type;

export const SearchCompanyPaginationSchema = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  totalPages: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  totalCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchCompanyPagination =
  typeof SearchCompanyPaginationSchema.Type;

export const SearchCompanyMetadataSchema = Schema.Struct({
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("dsae001"),
    endpoint: Schema.String,
  }),
  sourceBehavior: Schema.Struct({
    searchMode: Schema.Literal("company"),
    callerControlsPageSize: Schema.Literal(true),
    maxObservedPageSize: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
    observationStatus: Schema.Literal("observed"),
  }),
  completeness: Schema.Literal("complete", "partial"),
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchCompanyMetadata = typeof SearchCompanyMetadataSchema.Type;

export const SearchCompanyReferencesSchema = Schema.Struct({
  searchUrl: Schema.String,
});
export type SearchCompanyReferences =
  typeof SearchCompanyReferencesSchema.Type;

export const SearchCompanyWarningSchema = Schema.Struct({
  code: Schema.Literal("partial_rows_dropped"),
  message: Schema.String,
  droppedItemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type SearchCompanyWarning = typeof SearchCompanyWarningSchema.Type;

export const SearchCompanyResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: SearchCompanyRequestSchema,
    pagination: SearchCompanyPaginationSchema,
    items: Schema.Array(SearchCompanyItemSchema),
  }),
  metadata: SearchCompanyMetadataSchema,
  references: SearchCompanyReferencesSchema,
  warnings: Schema.Array(SearchCompanyWarningSchema),
}).annotations({
  identifier: "SearchCompanyResult",
  description: searchCompanySchemaCopy.resultDescription,
});
export type SearchCompanyResult = typeof SearchCompanyResultSchema.Type;
