import { Schema } from "effect";

import { annotateSchema, describedString, nonNegativeInt } from "../../schema-annotations.ts";
import { disclosureTypesSchemaCopy } from "../copy.ts";
import { DisclosureTypeCategorySchema, DisclosureTypesRequestSchema } from "./request.ts";

const DisclosureTypeCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^[A-J]\d{3}$/)),
  {
    description: "DART 공시상세유형 상세 코드. search-company-reports disclosureTypes 또는 CLI --disclosure-type에 전달합니다.",
    examples: ["A001", "I001"],
  },
);

export const DisclosureTypeItemSchema = Schema.Struct({
  code: DisclosureTypeCodeSchema,
  label: describedString("공시상세유형 한국어 라벨."),
});
export type DisclosureTypeResultItem = typeof DisclosureTypeItemSchema.Type;

export const DisclosureTypeCategoryGroupSchema = Schema.Struct({
  category: annotateSchema(DisclosureTypeCategorySchema, {
    description: "공시상세유형 대분류 코드.",
  }),
  categoryLabel: describedString("공시상세유형 대분류 한국어 라벨."),
  categoryDescription: describedString(
    "대분류를 선택할 때 참고할 수 있는 구현 작성 안내 설명입니다.",
  ),
  items: Schema.Array(DisclosureTypeItemSchema),
});
export type DisclosureTypeResultCategoryGroup =
  typeof DisclosureTypeCategoryGroupSchema.Type;

export const DisclosureTypesMetadataSchema = Schema.Struct({
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("open-dart-docs"), {
      description: "상세 코드 목록을 가져온 원천 문서 계열.",
    }),
    repository: describedString("원천 문서 GitHub repository."),
    commit: describedString("원천 문서 commit SHA."),
    path: describedString("원천 repository 안의 문서 경로."),
  }),
  categoryLabelSource: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart-fss-docs"), {
      description: "대분류 라벨을 확인한 원천 문서 계열.",
    }),
    url: describedString("대분류 라벨 원천 문서 URL."),
    codeSet: annotateSchema(Schema.Literal("pblntf_ty"), {
      description: "DART 공시유형 대분류 코드셋 이름.",
    }),
  }),
  categoryDescriptionProvenance: Schema.Struct({
    status: annotateSchema(Schema.Literal("implementation_authored_guidance"), {
      description: "대분류 설명이 외부 원천 필드가 아니라 구현에서 작성한 안내 문구임을 나타냅니다.",
    }),
    basis: describedString(
      "대분류 설명을 작성할 때 참고한 원천 코드셋과 항목 범위.",
    ),
  }),
  sourceBehavior: Schema.Struct({
    codeSet: annotateSchema(Schema.Literal("pblntf_detail_ty"), {
      description: "DART 공시상세유형 코드셋 이름.",
    }),
    categoryCodeSet: annotateSchema(Schema.Literal("pblntf_ty"), {
      description: "DART 공시유형 대분류 코드셋 이름.",
    }),
    observationStatus: annotateSchema(Schema.Literal("source_material"), {
      description: "외부 원천 문서를 고정 commit과 문서 URL로 반영한 정적 코드 목록임을 나타냅니다.",
    }),
  }),
  completeness: annotateSchema(Schema.Literal("complete"), {
    description: "정적 코드 목록 반영 상태.",
  }),
});
export type DisclosureTypesMetadata = typeof DisclosureTypesMetadataSchema.Type;

export const DisclosureTypesReferencesSchema = Schema.Struct({
  sourceUrl: describedString("코드 목록 원천 문서 URL."),
});
export type DisclosureTypesReferences = typeof DisclosureTypesReferencesSchema.Type;

export const DisclosureTypesWarningSchema = Schema.Struct({
  code: describedString("경고 코드."),
  message: describedString("경고 설명."),
});
export type DisclosureTypesWarning = typeof DisclosureTypesWarningSchema.Type;

export const DisclosureTypesResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: DisclosureTypesRequestSchema,
    totalCount: nonNegativeInt("반환된 공시상세유형 코드 수."),
    categories: Schema.Array(DisclosureTypeCategoryGroupSchema),
  }),
  metadata: DisclosureTypesMetadataSchema,
  references: DisclosureTypesReferencesSchema,
  warnings: Schema.Array(DisclosureTypesWarningSchema),
}).annotations({
  identifier: "DisclosureTypesResult",
  description: disclosureTypesSchemaCopy.resultDescription,
});
export type DisclosureTypesResult = typeof DisclosureTypesResultSchema.Type;
