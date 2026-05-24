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
  type ViewReportRequest,
} from "./request.ts";

export interface ViewReportTocNode {
  readonly id: string;
  readonly title: string;
  readonly children: readonly ViewReportTocNode[];
}

export const ViewReportTocNodeSchema: Schema.Schema<ViewReportTocNode> =
  Schema.Struct({
    id: describedString(
      "TOC section ID returned by darty. Use only as a follow-up view-report sectionId for the same receipt/documentId.",
    ),
    title: describedString("Section title shown in the DART viewer TOC."),
    children: annotateSchema(
      Schema.Array(
        Schema.suspend(
          (): Schema.Schema<ViewReportTocNode> => ViewReportTocNodeSchema,
        ).annotations({ identifier: "ViewReportTocNode" }),
      ),
      { description: "Child TOC sections." },
    ),
  }).annotations({ identifier: "ViewReportTocNode" });

export const ViewReportDocumentSchema = Schema.Struct({
  id: describedString(
    "Document ID returned by darty. Use as follow-up view-report documentId; this is not DART dcmNo.",
  ),
  title: describedString("Document title shown in the DART viewer document selector."),
  kind: annotateSchema(Schema.Literal("body", "attachment"), {
    description: "Indicates whether the document is the body document or an attachment.",
  }),
  selected: describedBoolean("true when this document is selected for the current request."),
});
export type ViewReportDocument = typeof ViewReportDocumentSchema.Type;

export const ViewReportReceiptSchema = Schema.Struct({
  receiptNumber: describedString("14-digit DART receipt number (rcpNo)."),
});
export type ViewReportReceipt = typeof ViewReportReceiptSchema.Type;

const ViewReportContentSectionSchema = Schema.Struct({
  id: describedString("toc[].id section ID represented by the current content.body."),
  title: describedString("Section title represented by the current content.body."),
});

const ViewReportContentWindowBaseFields = {
  unit: annotateSchema(Schema.Literal("utf8-bytes"), {
    description: "Window offset unit. Always UTF-8 bytes of rendered content.body.",
  }),
  startByte: nonNegativeInt(
    "Actual start byte of the returned window. This is not a DART viewer offset.",
  ),
  endByte: nonNegativeInt("Exclusive end byte of the returned window."),
} as const;

const ViewReportContinuableContentWindowSchema = Schema.Struct({
  ...ViewReportContentWindowBaseFields,
  hasMore: annotateSchema(Schema.Literal(true), {
    description: "true when more content remains to read.",
  }),
  nextStartByte: nonNegativeInt(
    "Next start byte to pass as contentStartByte for the same receipt/documentId/sectionId/outputFormat request.",
  ),
});

const ViewReportFinalContentWindowSchema = Schema.Struct({
  ...ViewReportContentWindowBaseFields,
  hasMore: annotateSchema(Schema.Literal(false), {
    description: "false when no more content remains to read.",
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
    description: "Indicates whether content.body represents the whole document or a selected section.",
  }),
  sizeBytes: nonNegativeInt("UTF-8 byte size of the full rendered content.body."),
  returnedBytes: nonNegativeInt("UTF-8 byte count returned in this response's content.body."),
  isFullContent: describedBoolean(
    "true when returned content.body is the full rendered body. Use window.hasMore to determine whether more content remains.",
  ),
  window: annotateSchema(ViewReportContentWindowSchema, {
    description: "Response window over rendered content.body. This is not DART viewer offset/length.",
  }),
  section: Schema.optional(ViewReportContentSectionSchema),
} as const;

export const ViewReportContentSchema = Schema.Struct({
  ...ViewReportContentBaseFields,
  format: annotateSchema(ViewReportOutputFormatSchema, {
    description: "Rendering format for content.body.",
  }),
  body: describedString(
    "Report body window rendered in the requested format. Even for Markdown requests, complex DART tables may remain as HTML table fragments to preserve structure; this is normal formatting behavior.",
  ),
});
export type ViewReportContent = typeof ViewReportContentSchema.Type;

export const ViewReportNavigationEntrySchema = Schema.Struct({
  id: describedString("Navigable toc[].id section ID."),
  title: describedString("Navigable section title."),
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
  fetchedAt: describedString("ISO timestamp when the report viewer was fetched."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), {
      description: "Source system.",
    }),
    surface: annotateSchema(Schema.Literal("dsaf001"), {
      description: "DART viewer surface used.",
    }),
    endpoints: Schema.Struct({
      shell: describedString("DART viewer shell endpoint."),
      content: Schema.optional(
        describedString(
          "Body iframe endpoint. Raw DART viewer query parameters are not exposed.",
        ),
      ),
    }),
  }),
  tocSource: annotateSchema(Schema.Literal("dart", "none"), {
    description: "Whether the TOC was returned by DART.",
  }),
});
export type ViewReportMetadata = typeof ViewReportMetadataSchema.Type;

export const ViewReportReferencesSchema = Schema.Struct({
  viewerUrl: describedString(
    "DART /dsaf001/main.do?rcpNo=... viewer URL. Can be used as view-report receipt.",
  ),
});
export type ViewReportReferences = typeof ViewReportReferencesSchema.Type;

export const ViewReportWarningSchema = Schema.Struct({
  code: annotateSchema(
    Schema.Literal("no_toc_returned_document", "content_truncated"),
    { description: "Recoverable state code that requires attention." },
  ),
  message: describedString("Warning explanation and required follow-up."),
});
export type ViewReportWarning = typeof ViewReportWarningSchema.Type;

export const ViewReportResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: ViewReportRequestSchema,
    receipt: ViewReportReceiptSchema,
    document: ViewReportDocumentSchema,
    documents: Schema.optional(Schema.Array(ViewReportDocumentSchema)),
    toc: Schema.optional(Schema.Array(ViewReportTocNodeSchema)),
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
type ViewReportSchemaResult = typeof ViewReportResultSchema.Type;
export type ViewReportResult = Omit<ViewReportSchemaResult, "result"> & {
  readonly result: Omit<ViewReportSchemaResult["result"], "request"> & {
    readonly request: ViewReportRequest;
  };
};
