import { Schema } from "effect";

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
    id: Schema.String,
    title: Schema.String,
    children: Schema.Array(
      Schema.suspend(
        (): Schema.Schema<ViewReportTocNode> => ViewReportTocNodeSchema,
      ).annotations({ identifier: "ViewReportTocNode" }),
    ),
  }).annotations({ identifier: "ViewReportTocNode" });

export const ViewReportDocumentSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  kind: Schema.Literal("body", "attachment"),
  selected: Schema.Boolean,
});
export type ViewReportDocument = typeof ViewReportDocumentSchema.Type;

export const ViewReportReceiptSchema = Schema.Struct({
  receiptNumber: Schema.String,
});
export type ViewReportReceipt = typeof ViewReportReceiptSchema.Type;

const ViewReportContentSectionSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
});

const ViewReportContentWindowBaseFields = {
  unit: Schema.Literal("utf8-bytes"),
  startByte: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  endByte: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
} as const;

const ViewReportContinuableContentWindowSchema = Schema.Struct({
  ...ViewReportContentWindowBaseFields,
  hasMore: Schema.Literal(true),
  nextStartByte: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});

const ViewReportFinalContentWindowSchema = Schema.Struct({
  ...ViewReportContentWindowBaseFields,
  hasMore: Schema.Literal(false),
});

const ViewReportContentWindowSchema = Schema.Union(
  ViewReportContinuableContentWindowSchema,
  ViewReportFinalContentWindowSchema,
);
export type ViewReportContentWindow =
  typeof ViewReportContentWindowSchema.Type;

const ViewReportContentBaseFields = {
  scope: Schema.Literal("document", "section"),
  sizeBytes: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedBytes: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  truncated: Schema.Boolean,
  window: ViewReportContentWindowSchema,
  section: Schema.optional(ViewReportContentSectionSchema),
} as const;

export const ViewReportContentSchema = Schema.Struct({
  ...ViewReportContentBaseFields,
  format: ViewReportOutputFormatSchema,
  body: Schema.String,
});
export type ViewReportContent = typeof ViewReportContentSchema.Type;

export const ViewReportNavigationEntrySchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
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
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("dsaf001"),
    endpoints: Schema.Struct({
      shell: Schema.String,
      content: Schema.optional(Schema.String),
    }),
  }),
  tocSource: Schema.Literal("dart", "none"),
});
export type ViewReportMetadata = typeof ViewReportMetadataSchema.Type;

export const ViewReportReferencesSchema = Schema.Struct({
  viewerUrl: Schema.String,
});
export type ViewReportReferences = typeof ViewReportReferencesSchema.Type;

export const ViewReportWarningSchema = Schema.Struct({
  code: Schema.Literal("no_toc_returned_document", "content_truncated"),
  message: Schema.String,
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
