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
  name: describedString("DART 결과 행에 표시된 회사명."),
  marketLabel: Schema.optional(
    describedString("DART 결과 행의 시장 구분 라벨. 예: 유가증권시장, 코스닥시장."),
  ),
  companyCode: Schema.optional(
    describedString("8자리 DART 회사 코드. 후속 company-detail, company-rss, search-company-reports 호출에 사용할 수 있습니다.", [
      "00126380",
    ]),
  ),
});
export type SearchBodyCompany = typeof SearchBodyCompanySchema.Type;

export const SearchBodyFilingSchema = Schema.Struct({
  receiptNumber: describedString("14자리 DART 접수번호(rcpNo). 후속 view-report receipt로 사용할 수 있습니다.", [
    "20260331904807",
  ]),
  documentNumber: Schema.optional(
    describedString("DART 문서번호(dcmNo). 참조용으로만 노출하며 caller 입력으로 요구하지 않습니다.", [
      "11216440",
    ]),
  ),
  reportTitle: describedString("DART 결과 행에서 정규화한 보고서 제목."),
  reportModifier: Schema.optional(describedString("정정, 첨부정정 등 보고서명 앞 modifier.")),
  reportPeriod: Schema.optional(describedString("보고서명에서 분리된 기간/회차 텍스트.")),
  reportNameSuffix: Schema.optional(describedString("보고서명에서 제목 뒤에 남은 suffix 텍스트.")),
  receiptDate: describedString("DART 접수일자(YYYY-MM-DD).", ["2026-03-31"]),
});
export type SearchBodyFiling = typeof SearchBodyFilingSchema.Type;

export const SearchBodyMatchSchema = Schema.Struct({
  snippetText: describedString("본문내용 검색어가 매칭된 DART snippet의 텍스트."),
  disclosureTypeLabel: Schema.optional(describedString("DART가 표시한 공시유형 라벨.")),
  contentTypeLabel: Schema.optional(describedString("본문 또는 첨부문서 등 DART가 표시한 매칭 대상 라벨.")),
  presenterName: Schema.optional(describedString("DART 결과 행의 제출인명.")),
});
export type SearchBodyMatch = typeof SearchBodyMatchSchema.Type;

export const SearchBodyItemReferencesSchema = Schema.Struct({
  viewerUrl: describedString("DART /dsaf001/main.do?rcpNo=... report-viewer URL. 후속 view-report receipt로 사용할 수 있습니다."),
});
export type SearchBodyItemReferences =
  typeof SearchBodyItemReferencesSchema.Type;

export const SearchBodyEvidenceSchema = Schema.Struct({
  reportNameRaw: describedString("DART 결과 행에서 보존한 원문 보고서명."),
  rawInfoText: describedString("DART 결과 행의 공시유형/본문구분/제출인 원문 텍스트."),
  snippetHtml: describedString("DART가 반환한 매칭 snippet HTML. 강조 태그 보존용 evidence입니다."),
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
    description: "반환된 DART 검색 결과 페이지(1부터 시작).",
  }),
  totalPages: nonNegativeInt("DART가 보고한 전체 페이지 수."),
  totalCount: nonNegativeInt("DART가 보고한 전체 검색 결과 수."),
  returnedCount: nonNegativeInt("이번 응답의 items 개수."),
});
export type SearchBodyPagination =
  typeof SearchBodyPaginationSchema.Type;

export const SearchBodyMetadataSchema = Schema.Struct({
  fetchedAt: describedString("DART 검색 응답을 처리한 ISO timestamp."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "원천 시스템." }),
    surface: annotateSchema(Schema.Literal("dsab007"), {
      description: "사용한 DART 통합검색 surface.",
    }),
    endpoint: describedString("DART 검색 replay endpoint."),
  }),
  sourceBehavior: Schema.Struct({
    effectivePageSize: nonNegativeInt("DART가 실제 반환한 페이지 크기."),
    effectivePagerWidth: nonNegativeInt("DART가 실제 반환한 pager 폭."),
    callerControlsPageSize: annotateSchema(Schema.Literal(false), {
      description: "search-body에서는 caller가 페이지 크기를 안정적으로 제어할 수 없음을 나타냅니다.",
    }),
    callerControlsPagerWidth: annotateSchema(Schema.Literal(false), {
      description: "search-body에서는 caller가 pager 폭을 안정적으로 제어할 수 없음을 나타냅니다.",
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
export type SearchBodyMetadata = typeof SearchBodyMetadataSchema.Type;

export const SearchBodyReferencesSchema = Schema.Struct({
  searchUrl: describedString("DART /dsab007/search.ax 검색 endpoint URL."),
});
export type SearchBodyReferences =
  typeof SearchBodyReferencesSchema.Type;

const PartialRowsDroppedWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("partial_rows_dropped"), {
    description: "결과 행 일부가 파싱되지 않았을 때 반환되는 경고 코드.",
  }),
  message: describedString("경고 설명."),
  droppedItemCount: nonNegativeInt("파싱하지 못해 제외한 결과 행 수."),
});

const NoResultsWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("no_results"), {
    description: "검색 조건에 맞는 DART 결과가 없을 때 반환되는 경고 코드.",
  }),
  message: describedString("근거 있는 검색 확장 또는 필터 완화 제안."),
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
