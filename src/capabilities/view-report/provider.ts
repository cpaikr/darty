import { Schema } from "effect";

import type { DartyExecutionContext } from "../types.ts";
import { DartyErrorDiagnosticsSchema } from "../../error-diagnostics.ts";
import { normalizeResponseDetail } from "../response-detail.ts";
import type {
  ViewReportRequest,
  ViewReportResult,
  ViewReportDocument,
  ViewReportReceipt,
  ViewReportTocNode,
  ViewReportContent,
  ViewReportNavigation,
  ViewReportMetadata,
  ViewReportReferences,
  ViewReportWarning,
} from "./contract.ts";

export type ViewReportProviderResult = {
  readonly receipt: ViewReportReceipt;
  readonly document: ViewReportDocument;
  readonly documents: readonly ViewReportDocument[];
  readonly toc: readonly ViewReportTocNode[];
  readonly content?: ViewReportContent;
  readonly navigation?: ViewReportNavigation;
  readonly metadata: ViewReportMetadata;
  readonly references: ViewReportReferences;
  readonly warnings: readonly ViewReportWarning[];
};

export class ViewReportProviderError extends Schema.TaggedError<ViewReportProviderError>()(
  "ViewReportProviderError",
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
    parameter: Schema.optional(Schema.String),
    sourceUrl: Schema.optional(Schema.String),
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}

export type ViewReportProvider = {
  readonly view: (
    request: ViewReportRequest,
    context?: DartyExecutionContext,
  ) => Promise<ViewReportProviderResult>;
};

const shouldIncludeLocators = (request: ViewReportRequest): boolean =>
  request.sectionId === undefined || normalizeResponseDetail(request.detail) !== "concise";

export const buildViewReportResult = (
  request: ViewReportRequest,
  providerResult: ViewReportProviderResult,
): ViewReportResult => ({
  result: {
    request,
    receipt: providerResult.receipt,
    document: providerResult.document,
    ...(shouldIncludeLocators(request)
      ? {
          documents: providerResult.documents,
          toc: providerResult.toc,
        }
      : {}),
    content: providerResult.content,
    navigation: providerResult.navigation,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
  warnings: providerResult.warnings,
});
