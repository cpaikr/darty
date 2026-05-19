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
    description: "8자리 DART 회사 코드. company-specific capability의 companyCode 입력으로 사용합니다.",
    examples: ["00126380"],
  },
);
const ListedStockCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{6}$/)),
  {
    description: "상장회사에 표시되는 6자리 종목코드. DART 회사 코드와 다릅니다.",
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
  detailEndpoint: describedString("DART 기업개황 상세 조회 endpoint. 내부 조회 참조용입니다."),
});
export type SearchCompanyItemReferences =
  typeof SearchCompanyItemReferencesSchema.Type;

export const SearchCompanyItemEvidenceSchema = Schema.Struct({
  rawCompanyLinkHref: describedString("companyCode를 추출한 DART 원문 회사 링크 href."),
  rawMarketBadgeText: Schema.optional(describedString("DART 원문 시장 badge 텍스트.")),
});
export type SearchCompanyItemEvidence =
  typeof SearchCompanyItemEvidenceSchema.Type;

export const SearchCompanyItemSchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: describedString("DART 기업개황 검색 결과의 회사명."),
  stockCode: Schema.optional(ListedStockCodeSchema),
  marketKind: annotateSchema(SearchCompanyMarketKindSchema, {
    description: "DART 시장 구분을 정규화한 값.",
  }),
  marketLabel: Schema.optional(describedString("DART 결과 행에 표시된 시장 구분 라벨.")),
  references: SearchCompanyItemReferencesSchema,
  evidence: SearchCompanyItemEvidenceSchema,
});
export type SearchCompanyItem = typeof SearchCompanyItemSchema.Type;

export const SearchCompanyPaginationSchema = Schema.Struct({
  currentPage: annotateSchema(Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)), {
    description: "반환된 DART 기업개황 검색 페이지(1부터 시작).",
  }),
  totalPages: nonNegativeInt("DART가 보고한 전체 페이지 수."),
  totalCount: nonNegativeInt("DART가 보고한 전체 회사 검색 결과 수."),
  returnedCount: nonNegativeInt("이번 응답의 items 개수."),
});
export type SearchCompanyPagination =
  typeof SearchCompanyPaginationSchema.Type;

export const SearchCompanyMetadataSchema = Schema.Struct({
  fetchedAt: describedString("DART 기업개황 검색 응답을 처리한 ISO timestamp."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "원천 시스템." }),
    surface: annotateSchema(Schema.Literal("dsae001"), {
      description: "사용한 DART 기업개황 surface.",
    }),
    endpoint: describedString("DART 기업개황 회사별 검색 endpoint."),
  }),
  sourceBehavior: Schema.Struct({
    searchMode: annotateSchema(Schema.Literal("company"), {
      description: "DART 기업개황 회사별 검색 모드.",
    }),
    callerControlsPageSize: annotateSchema(Schema.Literal(true), {
      description: "caller가 pageSize를 제어할 수 있음을 나타냅니다.",
    }),
    maxObservedPageSize: annotateSchema(
      Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
      { description: "live 조사에서 관찰한 최대 pageSize." },
    ),
    observationStatus: annotateSchema(Schema.Literal("observed"), {
      description: "source 동작이 live 조사로 확인된 상태.",
    }),
  }),
  completeness: annotateSchema(Schema.Literal("complete", "partial"), {
    description: "파싱 결과가 완전한지, 일부 행을 드롭했는지 나타냅니다.",
  }),
  droppedItemCount: nonNegativeInt("파싱하지 못해 items에서 제외한 회사 행 수."),
});
export type SearchCompanyMetadata = typeof SearchCompanyMetadataSchema.Type;

export const SearchCompanyReferencesSchema = Schema.Struct({
  searchUrl: describedString("DART 기업개황 회사별 검색 endpoint URL."),
});
export type SearchCompanyReferences =
  typeof SearchCompanyReferencesSchema.Type;

export const SearchCompanyWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("partial_rows_dropped"), {
    description: "복구 가능한 경고 코드. 결과 행 일부가 파싱되지 않았을 때만 반환됩니다.",
  }),
  message: describedString("경고 설명."),
  droppedItemCount: nonNegativeInt("파싱하지 못해 제외한 회사 행 수."),
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
