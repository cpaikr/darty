import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
  nonNegativeInt,
} from "../../schema-annotations.ts";
import { searchBodySchemaCopy } from "../copy.ts";
import {
  SearchBodyRequestSchema,
  type SearchBodyRequest,
} from "./request.ts";

export const SearchBodyCompanySchema = Schema.Struct({
  name: describedString("Company name shown in the DART result row."),
  marketLabel: Schema.optional(
    describedString("Market label shown in the DART result row, such as 유가증권시장 or 코스닥시장."),
  ),
  companyCode: Schema.optional(
    describedString("8-digit DART company code. Can be used in follow-up company-detail, company-rss, or search-company-reports calls.", [
      "00126380",
    ]),
  ),
});
export type SearchBodyCompany = typeof SearchBodyCompanySchema.Type;

export const SearchBodyFilingSchema = Schema.Struct({
  receiptNumber: describedString("14-digit DART receipt number (rcpNo). Can be used as view-report receipt.", [
    "20260331904807",
  ]),
  documentNumber: Schema.optional(
    describedString("DART document number (dcmNo). This is a detailed/raw source-verification locator, not a view-report documentId.", [
      "11216440",
    ]),
  ),
  reportTitle: describedString("Report title normalized from the DART result row."),
  reportModifier: Schema.optional(describedString("Report-title prefix modifier such as 정정 or 첨부정정.")),
  reportPeriod: Schema.optional(describedString("Period/sequence text split from the report title.")),
  reportNameSuffix: Schema.optional(describedString("Suffix text remaining after the report title.")),
  receiptDate: describedString("DART receipt date (YYYY-MM-DD).", ["2026-03-31"]),
});
export type SearchBodyFiling = typeof SearchBodyFilingSchema.Type;

export const SearchBodyMatchSchema = Schema.Struct({
  snippetText: describedString("Text of the DART snippet where the 본문내용 search term matched."),
  disclosureTypeLabel: Schema.optional(describedString("Disclosure type label shown by DART.")),
  contentTypeLabel: Schema.optional(describedString("DART target label such as 본문 or 첨부문서.")),
  presenterName: Schema.optional(describedString("제출인명 shown in the DART result row.")),
});
export type SearchBodyMatch = typeof SearchBodyMatchSchema.Type;

export const SearchBodyItemReferencesSchema = Schema.Struct({
  viewerUrl: describedString("DART /dsaf001/main.do?rcpNo=... report-viewer URL. The full URL can be passed as view-report receipt."),
});
export type SearchBodyItemReferences =
  typeof SearchBodyItemReferencesSchema.Type;

export const SearchBodyEvidenceSchema = Schema.Struct({
  reportNameRaw: describedString("Raw report name preserved from the DART result row."),
  rawInfoText: describedString("Raw DART info text for disclosure type, content type, and presenter."),
  snippetHtml: describedString("Matching snippet HTML returned by DART. Preserved as evidence for highlight markup."),
});
export type SearchBodyEvidence = typeof SearchBodyEvidenceSchema.Type;

export const SearchBodyItemSchema = Schema.Struct({
  company: SearchBodyCompanySchema,
  filing: SearchBodyFilingSchema,
  match: SearchBodyMatchSchema,
  references: SearchBodyItemReferencesSchema,
  evidence: Schema.optional(SearchBodyEvidenceSchema),
});
export type SearchBodyItem = typeof SearchBodyItemSchema.Type;

export const SearchBodyPaginationSchema = Schema.Struct({
  currentPage: annotateSchema(Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)), {
    description: "Returned DART search result page, starting at 1.",
  }),
  totalPages: nonNegativeInt("Total page count reported by DART."),
  totalCount: nonNegativeInt("Total search result count reported by DART."),
  returnedCount: nonNegativeInt("Number of items in this response."),
});
export type SearchBodyPagination =
  typeof SearchBodyPaginationSchema.Type;

export const SearchBodyMetadataSchema = Schema.Struct({
  fetchedAt: describedString("ISO timestamp when the DART search response was processed."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "Source system." }),
    surface: annotateSchema(Schema.Literal("dsab007"), {
      description: "DART integrated search surface used.",
    }),
    endpoint: describedString("DART search replay endpoint."),
  }),
  sourceBehavior: Schema.Struct({
    effectivePageSize: nonNegativeInt("Page size actually returned by DART."),
    effectivePagerWidth: nonNegativeInt("Pager width actually returned by DART."),
    callerControlsPageSize: annotateSchema(Schema.Literal(false), {
      description: "Indicates that search-body cannot reliably let callers control page size.",
    }),
    callerControlsPagerWidth: annotateSchema(Schema.Literal(false), {
      description: "Indicates that search-body cannot reliably let callers control pager width.",
    }),
    observationStatus: annotateSchema(Schema.Literal("observed"), {
      description: "Source behavior has been verified by live investigation.",
    }),
  }),
  completeness: annotateSchema(Schema.Literal("complete", "partial"), {
    description: "Whether parsing is complete or some rows were dropped.",
  }),
  droppedItemCount: nonNegativeInt("Number of result rows excluded from items because they could not be parsed."),
});
export type SearchBodyMetadata = typeof SearchBodyMetadataSchema.Type;

export const SearchBodyReferencesSchema = Schema.Struct({
  searchUrl: describedString("DART /dsab007/search.ax search endpoint URL."),
});
export type SearchBodyReferences =
  typeof SearchBodyReferencesSchema.Type;

const PartialRowsDroppedWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("partial_rows_dropped"), {
    description: "Warning code returned when some result rows were not parsed.",
  }),
  message: describedString("Warning explanation."),
  droppedItemCount: nonNegativeInt("Number of result rows dropped because they could not be parsed."),
});

const NoResultsWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("no_results"), {
    description: "Warning code returned when DART has no result for the search conditions.",
  }),
  message: describedString("Evidence-based suggestion to widen the search or relax filters."),
});

export const SearchBodyWarningSchema = Schema.Union(
  PartialRowsDroppedWarningSchema,
  NoResultsWarningSchema,
);
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
type SearchBodySchemaResult = typeof SearchBodyResultSchema.Type;
export type SearchBodyResult = Omit<SearchBodySchemaResult, "result"> & {
  readonly result: Omit<SearchBodySchemaResult["result"], "request" | "items"> & {
    readonly request: SearchBodyRequest;
    readonly items: readonly SearchBodyItem[];
  };
};
