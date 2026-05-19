import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
} from "../../schema-annotations.ts";
import { companyDetailSchemaCopy } from "../copy.ts";
import { CompanyDetailRequestSchema } from "./request.ts";

const DartCompanyCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{8}$/)),
  {
    description: "8자리 DART 회사 코드.",
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

export const CompanyDetailInfoSchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: describedString("DART 기업개황 상세 화면의 회사명."),
  englishName: Schema.optional(describedString("DART가 제공한 영문 회사명.")),
  disclosureCompanyName: Schema.optional(describedString("DART 공시대상회사명.")),
  stockCode: Schema.optional(ListedStockCodeSchema),
  representativeName: Schema.optional(describedString("대표자명.")),
  corporationKind: Schema.optional(describedString("DART 법인 구분/시장 구분 텍스트.")),
  corporateRegistrationNumber: Schema.optional(describedString("법인등록번호.")),
  businessRegistrationNumber: Schema.optional(describedString("사업자등록번호.")),
  address: Schema.optional(describedString("회사 주소.")),
  homepage: Schema.optional(describedString("DART가 제공한 회사 홈페이지 URL.")),
  phoneNumber: Schema.optional(describedString("대표 전화번호.")),
  faxNumber: Schema.optional(describedString("팩스번호.")),
  industryName: Schema.optional(describedString("업종명.")),
  establishedDate: Schema.optional(describedString("설립일.")),
  fiscalMonth: Schema.optional(describedString("결산월.")),
});
export type CompanyDetailInfo = typeof CompanyDetailInfoSchema.Type;

export const CompanyDetailMetadataSchema = Schema.Struct({
  fetchedAt: describedString("DART 기업개황 상세 응답을 처리한 ISO timestamp."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "원천 시스템." }),
    surface: annotateSchema(Schema.Literal("dsae001"), {
      description: "사용한 DART 기업개황 surface.",
    }),
    endpoint: describedString("DART 기업개황 상세 endpoint."),
  }),
  completeness: annotateSchema(Schema.Literal("complete"), {
    description: "company-detail은 현재 성공 시 완전 결과만 반환합니다.",
  }),
});
export type CompanyDetailMetadata = typeof CompanyDetailMetadataSchema.Type;

export const CompanyDetailReferencesSchema = Schema.Struct({
  detailUrl: describedString("DART 기업개황 상세 조회 URL."),
});
export type CompanyDetailReferences = typeof CompanyDetailReferencesSchema.Type;

export const CompanyDetailResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: CompanyDetailRequestSchema,
    company: CompanyDetailInfoSchema,
  }),
  metadata: CompanyDetailMetadataSchema,
  references: CompanyDetailReferencesSchema,
}).annotations({
  identifier: "CompanyDetailResult",
  description: companyDetailSchemaCopy.resultDescription,
});
export type CompanyDetailResult = typeof CompanyDetailResultSchema.Type;
