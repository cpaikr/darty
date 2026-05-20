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
    description: "8자리 DART 회사 코드.",
    examples: ["00126380"],
  },
);

export const SearchCompanyReportsCompanySchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  name: Schema.optional(describedString("DART 결과 행에서 확인된 회사명.")),
  marketLabel: Schema.optional(describedString("DART 결과 행의 시장 구분 라벨.")),
});
export type SearchCompanyReportsCompany =
  typeof SearchCompanyReportsCompanySchema.Type;

export const SearchCompanyReportsFilingSchema = Schema.Struct({
  receiptNumber: describedString("14자리 DART 접수번호(rcpNo). 후속 view-report receipt로 사용할 수 있습니다.", [
    "20260331004166",
  ]),
  reportTitle: describedString("DART 결과 행의 보고서 제목."),
  receiptDate: describedString("DART 접수일자(YYYY-MM-DD).", ["2026-03-31"]),
  presenterName: Schema.optional(describedString("DART 결과 행의 제출인명.")),
});
export type SearchCompanyReportsFiling =
  typeof SearchCompanyReportsFilingSchema.Type;

const SearchCompanyReportsDisclosureTypeCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^[A-J]\d{3}$/)),
  {
    description: "검색 결과 행에 귀속된 DART 공시상세유형 코드.",
    examples: ["A001", "I001"],
  },
);

const SearchCompanyReportsDisclosureTypeCategorySchema = annotateSchema(
  Schema.Literal("A", "B", "C", "D", "E", "F", "G", "H", "I", "J"),
  {
    description: "검색 결과 행에 귀속된 DART 공시상세유형 대분류 코드.",
    examples: ["A", "I"],
  },
);

export const SearchCompanyReportsMatchedDisclosureTypeSchema = Schema.Struct({
  code: SearchCompanyReportsDisclosureTypeCodeSchema,
  label: Schema.optional(describedString("공시상세유형 한국어 라벨.")),
  category: SearchCompanyReportsDisclosureTypeCategorySchema,
  categoryLabel: describedString("공시상세유형 대분류 한국어 라벨."),
  evidence: Schema.Struct({
    source: annotateSchema(Schema.Literal("single_disclosure_type_request"), {
      description:
        "DART 요청이 하나의 publicType으로 제한되어 행별 귀속이 가능한 경우임을 나타냅니다.",
    }),
  }),
});
export type SearchCompanyReportsMatchedDisclosureType =
  typeof SearchCompanyReportsMatchedDisclosureTypeSchema.Type;

export const SearchCompanyReportsItemReferencesSchema = Schema.Struct({
  viewerUrl: describedString("DART /dsaf001/main.do?rcpNo=... report-viewer URL. 후속 view-report receipt로 사용할 수 있습니다."),
});
export type SearchCompanyReportsItemReferences =
  typeof SearchCompanyReportsItemReferencesSchema.Type;

export const SearchCompanyReportsRemarkSchema = Schema.Struct({
  text: describedString("DART 결과 행의 비고 텍스트."),
  title: Schema.optional(describedString("DART 결과 행의 비고 title 속성.")),
});
export type SearchCompanyReportsRemark =
  typeof SearchCompanyReportsRemarkSchema.Type;

export const SearchCompanyReportsEvidenceSchema = Schema.Struct({
  rawRowText: describedString("DART 결과 행의 원문 텍스트. 파서 검증용 evidence입니다."),
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
    description: "반환된 DART 회사별 공시 검색 페이지(1부터 시작).",
  }),
  totalPages: nonNegativeInt("DART가 보고한 전체 페이지 수."),
  totalCount: nonNegativeInt("DART가 보고한 전체 공시 결과 수."),
  returnedCount: nonNegativeInt("이번 응답의 items 개수."),
});
export type SearchCompanyReportsPagination =
  typeof SearchCompanyReportsPaginationSchema.Type;

export const SearchCompanyReportsMetadataSchema = Schema.Struct({
  fetchedAt: describedString("DART 회사별 공시 검색 응답을 처리한 ISO timestamp."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "원천 시스템." }),
    surface: annotateSchema(Schema.Literal("dsab007"), {
      description: "사용한 DART 통합검색 surface.",
    }),
    endpoint: describedString("DART 회사별 공시 검색 endpoint."),
  }),
  sourceBehavior: Schema.Struct({
    searchMode: annotateSchema(Schema.Literal("corp"), {
      description: "DART 공시통합검색 회사명 모드.",
    }),
    sortBy: annotateSchema(Schema.Literal("date"), {
      description: "현재 capability가 사용하는 고정 정렬 기준.",
    }),
    callerControlsPageSize: annotateSchema(Schema.Literal(true), {
      description: "caller가 pageSize를 제어할 수 있음을 나타냅니다.",
    }),
    pageSizeChoices: annotateSchema(Schema.Array(Schema.Literal(15, 30, 50, 100)), {
      description: "DART 회사별 공시 검색에서 관찰된 pageSize 선택지.",
    }),
    finalReportDefault: annotateSchema(Schema.Literal(true), {
      description: "기본 요청은 DART 최종보고서 필터를 적용합니다.",
    }),
    observationStatus: annotateSchema(Schema.Literal("observed"), {
      description: "source 동작이 live 조사로 확인된 상태.",
    }),
  }),
  completeness: annotateSchema(Schema.Literal("complete", "partial"), {
    description: "파싱 결과가 완전한지, 일부 행을 드롭했는지 나타냅니다.",
  }),
  droppedItemCount: nonNegativeInt("파싱하지 못해 items에서 제외한 결과 행 수."),
});
export type SearchCompanyReportsMetadata =
  typeof SearchCompanyReportsMetadataSchema.Type;

export const SearchCompanyReportsReferencesSchema = Schema.Struct({
  searchUrl: describedString("DART /dsab007/detailSearch.ax 회사별 공시 검색 endpoint URL."),
});
export type SearchCompanyReportsReferences =
  typeof SearchCompanyReportsReferencesSchema.Type;

const PartialRowsDroppedWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("partial_rows_dropped"), {
    description: "결과 행 일부가 파싱되지 않았을 때 반환되는 경고 코드.",
  }),
  message: describedString("경고 설명."),
  droppedItemCount: nonNegativeInt("파싱하지 못해 제외한 결과 행 수."),
});

const MatchedDisclosureTypeAmbiguousWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("matched_disclosure_type_ambiguous"), {
    description:
      "여러 공시상세유형 코드로 검색해 결과 행의 매칭 코드가 모호할 때 반환되는 경고 코드.",
  }),
  message: describedString("경고 설명과 필요한 후속 조치."),
});

const NoResultsWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("no_results"), {
    description: "검색 조건에 맞는 DART 회사별 공시가 없을 때 반환되는 경고 코드.",
  }),
  message: describedString("근거 있는 검색 확장 또는 필터 완화 제안."),
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
