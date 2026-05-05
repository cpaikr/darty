import { Schema } from "effect";

import { reportViewSchemaCopy } from "../copy.ts";
import { ReportViewRequestSchema } from "./request.ts";

export interface ReportViewTocNode {
  readonly id: string;
  readonly title: string;
  readonly children: readonly ReportViewTocNode[];
}

export const ReportViewTocNodeSchema: Schema.Schema<ReportViewTocNode> =
  Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    children: Schema.Array(
      Schema.suspend(
        (): Schema.Schema<ReportViewTocNode> => ReportViewTocNodeSchema,
      ).annotations({ identifier: "ReportViewTocNode" }),
    ),
  }).annotations({ identifier: "ReportViewTocNode" });

export const ReportViewDocumentSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  kind: Schema.Literal("body", "attachment"),
  selected: Schema.Boolean,
});
export type ReportViewDocument = typeof ReportViewDocumentSchema.Type;

export const ReportViewReceiptSchema = Schema.Struct({
  receiptNumber: Schema.String,
});
export type ReportViewReceipt = typeof ReportViewReceiptSchema.Type;

export const ReportViewContentSchema = Schema.Struct({
  scope: Schema.Literal("document", "section"),
  format: Schema.Literal("html"),
  html: Schema.String,
  sizeBytes: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  returnedBytes: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  truncated: Schema.Boolean,
  section: Schema.optional(
    Schema.Struct({
      id: Schema.String,
      title: Schema.String,
    }),
  ),
});
export type ReportViewContent = typeof ReportViewContentSchema.Type;

export const ReportViewNavigationEntrySchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
});
export type ReportViewNavigationEntry =
  typeof ReportViewNavigationEntrySchema.Type;

export const ReportViewNavigationSchema = Schema.Struct({
  parent: Schema.optional(ReportViewNavigationEntrySchema),
  previous: Schema.optional(ReportViewNavigationEntrySchema),
  next: Schema.optional(ReportViewNavigationEntrySchema),
  children: Schema.Array(ReportViewNavigationEntrySchema),
});
export type ReportViewNavigation = typeof ReportViewNavigationSchema.Type;

export const ReportViewMetadataSchema = Schema.Struct({
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
  outputFormat: Schema.Literal("html"),
});
export type ReportViewMetadata = typeof ReportViewMetadataSchema.Type;

export const ReportViewReferencesSchema = Schema.Struct({
  viewerUrl: Schema.String,
});
export type ReportViewReferences = typeof ReportViewReferencesSchema.Type;

export const ReportViewWarningSchema = Schema.Struct({
  code: Schema.Literal("no_toc_returned_document", "content_truncated"),
  message: Schema.String,
});
export type ReportViewWarning = typeof ReportViewWarningSchema.Type;

export const ReportViewResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: ReportViewRequestSchema,
    receipt: ReportViewReceiptSchema,
    document: ReportViewDocumentSchema,
    documents: Schema.Array(ReportViewDocumentSchema),
    toc: Schema.Array(ReportViewTocNodeSchema),
    content: Schema.optional(ReportViewContentSchema),
    navigation: Schema.optional(ReportViewNavigationSchema),
  }),
  metadata: ReportViewMetadataSchema,
  references: ReportViewReferencesSchema,
  warnings: Schema.Array(ReportViewWarningSchema),
}).annotations({
  identifier: "ReportViewResult",
  description: reportViewSchemaCopy.resultDescription,
});
export type ReportViewResult = typeof ReportViewResultSchema.Type;
