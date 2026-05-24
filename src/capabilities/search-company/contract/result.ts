import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
  nonNegativeInt,
} from "../../schema-annotations.ts";
import { searchCompanySchemaCopy } from "../copy.ts";
import { SearchCompanyRequestSchema } from "./request.ts";

const DartCompanyCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{8}$/)),
  {
    description: "8-digit DART company code. Use it as companyCode for company-specific capabilities.",
    examples: ["00126380"],
  },
);
const ListedStockCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{6}$/)),
  {
    description: "6-digit stock code shown for listed companies. This differs from the DART company code.",
    examples: ["005930"],
  },
);

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
  detailEndpoint: describedString("DART 기업개황 detail endpoint for internal lookup reference."),
});
export type SearchCompanyItemReferences =
  typeof SearchCompanyItemReferencesSchema.Type;

export const SearchCompanyItemEvidenceSchema = Schema.Struct({
  rawCompanyLinkHref: describedString("Raw DART company link href from which companyCode was extracted."),
  rawMarketBadgeText: Schema.optional(describedString("Raw DART market badge text.")),
});
export type SearchCompanyItemEvidence =
  typeof SearchCompanyItemEvidenceSchema.Type;

export const SearchCompanyItemSchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: describedString("Company name in DART 기업개황 search results."),
  stockCode: Schema.optional(ListedStockCodeSchema),
  marketKind: annotateSchema(SearchCompanyMarketKindSchema, {
    description: "Normalized DART market category.",
  }),
  marketLabel: Schema.optional(describedString("Market category label shown in the DART result row.")),
  references: SearchCompanyItemReferencesSchema,
  evidence: SearchCompanyItemEvidenceSchema,
});
export type SearchCompanyItem = typeof SearchCompanyItemSchema.Type;

export const SearchCompanyPaginationSchema = Schema.Struct({
  currentPage: annotateSchema(Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)), {
    description: "Returned DART 기업개황 search page, starting at 1.",
  }),
  totalPages: nonNegativeInt("Total page count reported by DART."),
  totalCount: nonNegativeInt("Total company search result count reported by DART."),
  returnedCount: nonNegativeInt("Number of items in this response."),
});
export type SearchCompanyPagination =
  typeof SearchCompanyPaginationSchema.Type;

export const SearchCompanyMetadataSchema = Schema.Struct({
  fetchedAt: describedString("ISO timestamp when the DART 기업개황 search response was processed."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "Source system." }),
    surface: annotateSchema(Schema.Literal("dsae001"), {
      description: "DART 기업개황 surface used.",
    }),
    endpoint: describedString("DART 기업개황 company-search endpoint."),
  }),
  sourceBehavior: Schema.Struct({
    searchMode: annotateSchema(Schema.Literal("company"), {
      description: "DART 기업개황 company-search mode.",
    }),
    callerControlsPageSize: annotateSchema(Schema.Literal(true), {
      description: "Indicates that callers can control pageSize.",
    }),
    maxObservedPageSize: annotateSchema(
      Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
      { description: "Maximum pageSize observed in live investigation." },
    ),
    observationStatus: annotateSchema(Schema.Literal("observed"), {
      description: "Source behavior has been verified by live investigation.",
    }),
  }),
  completeness: annotateSchema(Schema.Literal("complete", "partial"), {
    description: "Whether parsing is complete or some rows were dropped.",
  }),
  droppedItemCount: nonNegativeInt("Number of company rows excluded from items because they could not be parsed."),
});
export type SearchCompanyMetadata = typeof SearchCompanyMetadataSchema.Type;

export const SearchCompanyReferencesSchema = Schema.Struct({
  searchUrl: describedString("DART 기업개황 company-search endpoint URL."),
});
export type SearchCompanyReferences =
  typeof SearchCompanyReferencesSchema.Type;

const PartialRowsDroppedWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("partial_rows_dropped"), {
    description: "Warning code returned when some result rows were not parsed.",
  }),
  message: describedString("Warning explanation."),
  droppedItemCount: nonNegativeInt("Number of company rows dropped because they could not be parsed."),
});

const NoResultsWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("no_results"), {
    description: "Warning code returned when DART has no company matching the search conditions.",
  }),
  message: describedString("Evidence-based suggestion for widening the search."),
});

export const SearchCompanyWarningSchema = Schema.Union(
  PartialRowsDroppedWarningSchema,
  NoResultsWarningSchema,
);
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
