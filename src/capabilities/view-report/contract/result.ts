import { Schema } from "effect";

import {
  annotateSchema,
  describedBoolean,
  describedString,
  nonNegativeInt,
} from "../../schema-annotations.ts";
import { viewReportSchemaCopy } from "../copy.ts";
import {
  ViewReportOutputFormatSchema,
  ViewReportRequestSchema,
} from "./request.ts";

export interface ViewReportTocNode {
  readonly id: string;
  readonly title: string;
  readonly children: readonly ViewReportTocNode[];
}

export const ViewReportTocNodeSchema: Schema.Schema<ViewReportTocNode> =
  Schema.Struct({
    id: describedString(
      "darty가 반환한 목차 섹션 ID. 같은 receipt/documentId의 후속 view-report sectionId로만 사용하세요.",
    ),
    title: describedString("DART viewer 목차에 표시된 섹션 제목."),
    children: annotateSchema(
      Schema.Array(
        Schema.suspend(
          (): Schema.Schema<ViewReportTocNode> => ViewReportTocNodeSchema,
        ).annotations({ identifier: "ViewReportTocNode" }),
      ),
      { description: "하위 목차 섹션." },
    ),
  }).annotations({ identifier: "ViewReportTocNode" });

export const ViewReportDocumentSchema = Schema.Struct({
  id: describedString(
    "darty가 반환한 문서 ID. 후속 view-report documentId로 사용하며 DART dcmNo가 아닙니다.",
  ),
  title: describedString("DART viewer 문서 선택 목록의 문서 제목."),
  kind: annotateSchema(Schema.Literal("body", "attachment"), {
    description: "본문 문서인지 첨부 문서인지 나타냅니다.",
  }),
  selected: describedBoolean("현재 요청에서 선택된 문서이면 true."),
});
export type ViewReportDocument = typeof ViewReportDocumentSchema.Type;

export const ViewReportReceiptSchema = Schema.Struct({
  receiptNumber: describedString("14자리 DART 접수번호(rcpNo)."),
});
export type ViewReportReceipt = typeof ViewReportReceiptSchema.Type;

const ViewReportContentSectionSchema = Schema.Struct({
  id: describedString("현재 content.body가 나타내는 toc[].id 섹션 ID."),
  title: describedString("현재 content.body가 나타내는 섹션 제목."),
});

const ViewReportContentWindowBaseFields = {
  unit: annotateSchema(Schema.Literal("utf8-bytes"), {
    description: "window offset 단위. 항상 렌더링된 content.body의 UTF-8 바이트입니다.",
  }),
  startByte: nonNegativeInt(
    "반환된 창의 실제 시작 바이트. DART viewer offset이 아닙니다.",
  ),
  endByte: nonNegativeInt("반환된 창의 exclusive 끝 바이트."),
} as const;

const ViewReportContinuableContentWindowSchema = Schema.Struct({
  ...ViewReportContentWindowBaseFields,
  hasMore: annotateSchema(Schema.Literal(true), {
    description: "이어 읽을 content가 남아 있으면 true.",
  }),
  nextStartByte: nonNegativeInt(
    "같은 receipt/documentId/sectionId/outputFormat 요청의 contentStartByte로 넘길 다음 시작 바이트.",
  ),
});

const ViewReportFinalContentWindowSchema = Schema.Struct({
  ...ViewReportContentWindowBaseFields,
  hasMore: annotateSchema(Schema.Literal(false), {
    description: "이어 읽을 content가 없으면 false.",
  }),
});

const ViewReportContentWindowSchema = Schema.Union(
  ViewReportContinuableContentWindowSchema,
  ViewReportFinalContentWindowSchema,
);
export type ViewReportContentWindow =
  typeof ViewReportContentWindowSchema.Type;

const ViewReportContentBaseFields = {
  scope: annotateSchema(Schema.Literal("document", "section"), {
    description: "content.body가 전체 문서인지 선택 섹션인지 나타냅니다.",
  }),
  sizeBytes: nonNegativeInt("렌더링된 전체 content.body의 UTF-8 바이트 크기."),
  returnedBytes: nonNegativeInt("이번 응답에 반환된 content.body UTF-8 바이트 수."),
  isFullContent: describedBoolean(
    "반환된 content.body가 전체 렌더링 본문이면 true. 이어 읽을 내용은 window.hasMore로 판단하세요.",
  ),
  window: annotateSchema(ViewReportContentWindowSchema, {
    description: "렌더링된 content.body 기준 응답 창. DART viewer offset/length가 아닙니다.",
  }),
  section: Schema.optional(ViewReportContentSectionSchema),
} as const;

export const ViewReportContentSchema = Schema.Struct({
  ...ViewReportContentBaseFields,
  format: annotateSchema(ViewReportOutputFormatSchema, {
    description: "content.body의 렌더링 형식.",
  }),
  body: describedString("요청한 형식으로 렌더링된 보고서 본문 창."),
});
export type ViewReportContent = typeof ViewReportContentSchema.Type;

export const ViewReportNavigationEntrySchema = Schema.Struct({
  id: describedString("이동 가능한 toc[].id 섹션 ID."),
  title: describedString("이동 가능한 섹션 제목."),
});
export type ViewReportNavigationEntry =
  typeof ViewReportNavigationEntrySchema.Type;

export const ViewReportNavigationSchema = Schema.Struct({
  parent: Schema.optional(ViewReportNavigationEntrySchema),
  previous: Schema.optional(ViewReportNavigationEntrySchema),
  next: Schema.optional(ViewReportNavigationEntrySchema),
  children: Schema.Array(ViewReportNavigationEntrySchema),
});
export type ViewReportNavigation = typeof ViewReportNavigationSchema.Type;

export const ViewReportMetadataSchema = Schema.Struct({
  fetchedAt: describedString("보고서 viewer를 조회한 ISO timestamp."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), {
      description: "원천 시스템.",
    }),
    surface: annotateSchema(Schema.Literal("dsaf001"), {
      description: "사용한 DART viewer surface.",
    }),
    endpoints: Schema.Struct({
      shell: describedString("DART viewer shell endpoint."),
      content: Schema.optional(
        describedString(
          "본문 iframe endpoint. raw DART viewer query parameters는 공개하지 않습니다.",
        ),
      ),
    }),
  }),
  tocSource: annotateSchema(Schema.Literal("dart", "none"), {
    description: "목차가 DART에서 반환되었는지 여부.",
  }),
});
export type ViewReportMetadata = typeof ViewReportMetadataSchema.Type;

export const ViewReportReferencesSchema = Schema.Struct({
  viewerUrl: describedString(
    "DART /dsaf001/main.do?rcpNo=... viewer URL. 후속 view-report receipt로 사용할 수 있습니다.",
  ),
});
export type ViewReportReferences = typeof ViewReportReferencesSchema.Type;

export const ViewReportWarningSchema = Schema.Struct({
  code: annotateSchema(
    Schema.Literal("no_toc_returned_document", "content_truncated"),
    { description: "주의가 필요한 recoverable 상태 코드." },
  ),
  message: describedString("경고 설명과 필요한 후속 조치."),
});
export type ViewReportWarning = typeof ViewReportWarningSchema.Type;

export const ViewReportResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: ViewReportRequestSchema,
    receipt: ViewReportReceiptSchema,
    document: ViewReportDocumentSchema,
    documents: Schema.Array(ViewReportDocumentSchema),
    toc: Schema.Array(ViewReportTocNodeSchema),
    content: Schema.optional(ViewReportContentSchema),
    navigation: Schema.optional(ViewReportNavigationSchema),
  }),
  metadata: ViewReportMetadataSchema,
  references: ViewReportReferencesSchema,
  warnings: Schema.Array(ViewReportWarningSchema),
}).annotations({
  identifier: "ViewReportResult",
  description: viewReportSchemaCopy.resultDescription,
});
export type ViewReportResult = typeof ViewReportResultSchema.Type;
