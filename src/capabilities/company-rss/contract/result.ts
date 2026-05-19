import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
  nonNegativeInt,
} from "../../schema-annotations.ts";
import { companyRssSchemaCopy } from "../copy.ts";
import { CompanyRssRequestSchema } from "./request.ts";

const receiptNumberSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{14}$/)),
  {
    description: "14자리 DART 접수번호(rcpNo). 후속 view-report receipt로 사용할 수 있습니다.",
    examples: ["20260331004166"],
  },
);

export const CompanyRssChannelSchema = Schema.Struct({
  title: describedString("DART companyRSS 채널 제목."),
  link: describedString("DART companyRSS 채널 링크."),
  description: Schema.optional(describedString("DART companyRSS 채널 설명.")),
  language: Schema.optional(describedString("RSS 언어 코드.")),
  publishedAt: Schema.optional(describedString("RSS 채널 발행 시각.")),
});
export type CompanyRssChannel = typeof CompanyRssChannelSchema.Type;

export const CompanyRssItemSchema = Schema.Struct({
  title: annotateSchema(Schema.NonEmptyString, {
    description: "RSS 항목 제목. 보통 DART 공시 보고서명입니다.",
  }),
  link: annotateSchema(Schema.NonEmptyString, {
    description: "DART /dsaf001/main.do?rcpNo=... report-viewer URL. 후속 view-report receipt로 사용할 수 있습니다.",
  }),
  receiptNumber: Schema.optional(receiptNumberSchema),
  publishedAt: Schema.optional(describedString("RSS 항목 발행 시각.")),
  creator: Schema.optional(describedString("RSS dc:creator 값. 보통 제출인명입니다.")),
  guid: Schema.optional(describedString("RSS guid 값.")),
});
export type CompanyRssItem = typeof CompanyRssItemSchema.Type;

export const CompanyRssMetadataSchema = Schema.Struct({
  fetchedAt: describedString("DART companyRSS 응답을 처리한 ISO timestamp."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "원천 시스템." }),
    surface: annotateSchema(Schema.Literal("companyRSS"), {
      description: "사용한 DART companyRSS surface.",
    }),
    endpoint: describedString("DART companyRSS endpoint."),
  }),
  completeness: annotateSchema(Schema.Literal("complete"), {
    description: "company-rss는 현재 성공 시 완전 결과만 반환합니다.",
  }),
  itemCount: nonNegativeInt("이번 RSS 응답의 items 개수."),
});
export type CompanyRssMetadata = typeof CompanyRssMetadataSchema.Type;

export const CompanyRssReferencesSchema = Schema.Struct({
  rssUrl: describedString("DART companyRSS XML URL."),
});
export type CompanyRssReferences = typeof CompanyRssReferencesSchema.Type;

export const CompanyRssResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: CompanyRssRequestSchema,
    channel: CompanyRssChannelSchema,
    items: Schema.Array(CompanyRssItemSchema),
  }),
  metadata: CompanyRssMetadataSchema,
  references: CompanyRssReferencesSchema,
}).annotations({
  identifier: "CompanyRssResult",
  description: companyRssSchemaCopy.resultDescription,
});
export type CompanyRssResult = typeof CompanyRssResultSchema.Type;
