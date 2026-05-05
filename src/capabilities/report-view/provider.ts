import { Schema } from "effect";

import type {
  ReportViewRequest,
  ReportViewResult,
  ReportViewDocument,
  ReportViewReceipt,
  ReportViewTocNode,
  ReportViewContent,
  ReportViewNavigation,
  ReportViewMetadata,
  ReportViewReferences,
  ReportViewWarning,
} from "./contract.ts";

export type ReportViewProviderResult = {
  readonly receipt: ReportViewReceipt;
  readonly document: ReportViewDocument;
  readonly documents: readonly ReportViewDocument[];
  readonly toc: readonly ReportViewTocNode[];
  readonly content?: ReportViewContent;
  readonly navigation?: ReportViewNavigation;
  readonly metadata: ReportViewMetadata;
  readonly references: ReportViewReferences;
  readonly warnings: readonly ReportViewWarning[];
};

export class ReportViewProviderError extends Schema.TaggedError<ReportViewProviderError>()(
  "ReportViewProviderError",
  {
    code: Schema.Literal(
      "not_found",
      "source_unavailable",
      "source_changed",
      "source_parse_failure",
      "internal_provider_error",
    ),
    message: Schema.String,
    retryable: Schema.Boolean,
    providerId: Schema.String,
    sourceUrl: Schema.optional(Schema.String),
  },
) {}

export type ReportViewProvider = {
  readonly view: (request: ReportViewRequest) => Promise<ReportViewProviderResult>;
};

export const buildReportViewResult = (
  request: ReportViewRequest,
  providerResult: ReportViewProviderResult,
): ReportViewResult => ({
  result: {
    request,
    receipt: providerResult.receipt,
    document: providerResult.document,
    documents: providerResult.documents,
    toc: providerResult.toc,
    content: providerResult.content,
    navigation: providerResult.navigation,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
  warnings: providerResult.warnings,
});
