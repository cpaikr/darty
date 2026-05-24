import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
  nonNegativeInt,
} from "../../schema-annotations.ts";
import { searchCompanyReportsSchemaCopy } from "../copy.ts";
import {
  SearchCompanyReportsRequestSchema,
  type SearchCompanyReportsRequest,
} from "./request.ts";

const DartCompanyCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{8}$/)),
  {
    description: "8-digit DART company code.",
    examples: ["00126380"],
  },
);

export const SearchCompanyReportsCompanySchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  name: Schema.optional(describedString("Company name observed in the DART result row.")),
  marketLabel: Schema.optional(describedString("Market category label in the DART result row.")),
});
export type SearchCompanyReportsCompany =
  typeof SearchCompanyReportsCompanySchema.Type;

export const SearchCompanyReportsFilingSchema = Schema.Struct({
  receiptNumber: describedString("14-digit DART receipt number (rcpNo). Can be used as view-report receipt.", [
    "20260331004166",
  ]),
  reportTitle: describedString("Report title in the DART result row."),
  receiptDate: describedString("DART receipt date (YYYY-MM-DD).", ["2026-03-31"]),
  presenterName: Schema.optional(describedString("제출인명 in the DART result row.")),
});
export type SearchCompanyReportsFiling =
  typeof SearchCompanyReportsFilingSchema.Type;

const SearchCompanyReportsDisclosureTypeCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^[A-J]\d{3}$/)),
  {
    description: "DART 공시상세유형 code attributed to the search result row.",
    examples: ["A001", "I001"],
  },
);

const SearchCompanyReportsDisclosureTypeCategorySchema = annotateSchema(
  Schema.Literal("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"),
  {
    description: "DART 공시상세유형 category code attributed to the search result row.",
    examples: ["A", "I"],
  },
);

export const SearchCompanyReportsMatchedDisclosureTypeSchema = Schema.Struct({
  code: SearchCompanyReportsDisclosureTypeCodeSchema,
  label: Schema.optional(describedString("Korean 공시상세유형 label.")),
  category: SearchCompanyReportsDisclosureTypeCategorySchema,
  categoryLabel: describedString("Korean 공시상세유형 category label."),
  evidence: Schema.Struct({
    source: annotateSchema(Schema.Literal("single_disclosure_type_request"), {
      description:
        "Indicates that the DART request was limited to one publicType, making row-level attribution possible.",
    }),
  }),
});
export type SearchCompanyReportsMatchedDisclosureType =
  typeof SearchCompanyReportsMatchedDisclosureTypeSchema.Type;

export const SearchCompanyReportsItemReferencesSchema = Schema.Struct({
  viewerUrl: describedString("DART /dsaf001/main.do?rcpNo=... report-viewer URL. Can be used as view-report receipt."),
});
export type SearchCompanyReportsItemReferences =
  typeof SearchCompanyReportsItemReferencesSchema.Type;

export const SearchCompanyReportsRemarkSchema = Schema.Struct({
  text: describedString("Remark text in the DART result row."),
  title: Schema.optional(describedString("Remark title attribute in the DART result row.")),
});
export type SearchCompanyReportsRemark =
  typeof SearchCompanyReportsRemarkSchema.Type;

export const SearchCompanyReportsEvidenceSchema = Schema.Struct({
  rawRowText: describedString("Raw DART result row text, preserved as parser-check evidence."),
});
export type SearchCompanyReportsEvidence =
  typeof SearchCompanyReportsEvidenceSchema.Type;

export const SearchCompanyReportsItemSchema = Schema.Struct({
  company: SearchCompanyReportsCompanySchema,
  filing: SearchCompanyReportsFilingSchema,
  matchedDisclosureType: Schema.optional(
    SearchCompanyReportsMatchedDisclosureTypeSchema,
  ),
  references: SearchCompanyReportsItemReferencesSchema,
  remarks: Schema.Array(SearchCompanyReportsRemarkSchema),
  evidence: Schema.optional(SearchCompanyReportsEvidenceSchema),
});
export type SearchCompanyReportsItem =
  typeof SearchCompanyReportsItemSchema.Type;

export const SearchCompanyReportsPaginationSchema = Schema.Struct({
  currentPage: annotateSchema(Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)), {
    description: "Returned DART company filing search page, starting at 1.",
  }),
  totalPages: nonNegativeInt("Total page count reported by DART."),
  totalCount: nonNegativeInt("Total filing result count reported by DART."),
  returnedCount: nonNegativeInt("Number of items in this response."),
});
export type SearchCompanyReportsPagination =
  typeof SearchCompanyReportsPaginationSchema.Type;

export const SearchCompanyReportsMetadataSchema = Schema.Struct({
  fetchedAt: describedString("ISO timestamp when the DART company filing search response was processed."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "Source system." }),
    surface: annotateSchema(Schema.Literal("dsab007"), {
      description: "DART integrated search surface used.",
    }),
    endpoint: describedString("DART company filing search endpoint."),
  }),
  sourceBehavior: Schema.Struct({
    searchMode: annotateSchema(Schema.Literal("corp"), {
      description: "DART 공시통합검색 company-name mode.",
    }),
    sortBy: annotateSchema(Schema.Literal("date"), {
      description: "Fixed sort key used by this capability.",
    }),
    callerControlsPageSize: annotateSchema(Schema.Literal(true), {
      description: "Indicates that callers can control pageSize.",
    }),
    pageSizeChoices: annotateSchema(Schema.Array(Schema.Literal(15, 30, 50, 100)), {
      description: "pageSize choices observed for DART company filing search.",
    }),
    finalReportDefault: annotateSchema(Schema.Literal(true), {
      description: "Default requests apply DART's final-report filter.",
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
export type SearchCompanyReportsMetadata =
  typeof SearchCompanyReportsMetadataSchema.Type;

export const SearchCompanyReportsReferencesSchema = Schema.Struct({
  searchUrl: describedString("DART /dsab007/detailSearch.ax company filing search endpoint URL."),
});
export type SearchCompanyReportsReferences =
  typeof SearchCompanyReportsReferencesSchema.Type;

const PartialRowsDroppedWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("partial_rows_dropped"), {
    description: "Warning code returned when some result rows were not parsed.",
  }),
  message: describedString("Warning explanation."),
  droppedItemCount: nonNegativeInt("Number of result rows dropped because they could not be parsed."),
});

const MatchedDisclosureTypeAmbiguousWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("matched_disclosure_type_ambiguous"), {
    description:
      "Warning code returned when a search with multiple 공시상세유형 codes makes row-level matching ambiguous.",
  }),
  message: describedString("Warning explanation and required follow-up."),
});

const NoResultsWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("no_results"), {
    description: "Warning code returned when DART has no company filings matching the search conditions.",
  }),
  message: describedString("Evidence-based suggestion to widen the search or relax filters."),
});

export const SearchCompanyReportsWarningSchema = Schema.Union(
  PartialRowsDroppedWarningSchema,
  MatchedDisclosureTypeAmbiguousWarningSchema,
  NoResultsWarningSchema,
);
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
type SearchCompanyReportsSchemaResult =
  typeof SearchCompanyReportsResultSchema.Type;
export type SearchCompanyReportsResult = Omit<
  SearchCompanyReportsSchemaResult,
  "result"
> & {
  readonly result: Omit<
    SearchCompanyReportsSchemaResult["result"],
    "request" | "items"
  > & {
    readonly request: SearchCompanyReportsRequest;
    readonly items: readonly SearchCompanyReportsItem[];
  };
};
