import type {
  ReportViewDocument,
  ReportViewRequest,
  ReportViewTocNode,
  ReportViewWarning,
} from "../../../../capabilities/report-view/contract.ts";
import { extractReceiptNumber } from "../../../../capabilities/report-view/contract.ts";
import {
  ReportViewProviderError,
  type ReportViewProvider,
  type ReportViewProviderResult,
} from "../../../../capabilities/report-view/provider.ts";
import {
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../../errors.ts";
import { buildReportContent } from "./content.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { buildReportNavigation } from "./navigation.ts";
import { resolveReportContentPlan } from "./plan.ts";
import {
  defaultDsaf001ReportSource,
  type Dsaf001ReportSource,
} from "./source.ts";
import type {
  SourceReportDocument,
  SourceReportSection,
  SourceReportShell,
} from "./source-model.ts";

const providerId = "dart-dsaf001-report";

export type { Dsaf001ReportSource } from "./source.ts";
export { defaultDsaf001ReportSource } from "./source.ts";

const toPublicDocument = (
  document: SourceReportDocument,
): ReportViewDocument => ({
  id: document.id,
  title: document.title,
  kind: document.kind,
  selected: document.selected,
});

const toPublicTocNode = (section: SourceReportSection): ReportViewTocNode => ({
  id: section.id,
  title: section.title,
  children: section.children.map(toPublicTocNode),
});

const extractInitialDocumentQuery = (
  receipt: string,
  receiptNumber: string,
): string | undefined => {
  try {
    const url = new URL(receipt);
    const documentNumber = url.searchParams.get("dcmNo");

    if (documentNumber === null || documentNumber.trim() === "") {
      return undefined;
    }

    const params = new URLSearchParams({
      rcpNo: receiptNumber,
      dcmNo: documentNumber,
    });

    return params.toString();
  } catch {
    return undefined;
  }
};

const selectShell = async (
  source: Dsaf001ReportSource,
  receiptNumber: string,
  documentId: string | undefined,
  initialDocumentQuery: string | undefined,
): Promise<SourceReportShell> => {
  const initialShell = await source.fetchShell(receiptNumber, initialDocumentQuery);

  if (documentId === undefined || initialShell.selectedDocument.id === documentId) {
    return initialShell;
  }

  const document = initialShell.documents.find(
    (candidate) => candidate.id === documentId,
  );

  if (document === undefined) {
    throw new ReportViewProviderError({
      code: "not_found",
      message: dsaf001ReportMessages.documentNotFound(documentId),
      retryable: false,
      providerId,
      sourceUrl: initialShell.sourceUrl,
    });
  }

  return source.fetchShell(receiptNumber, document.query);
};

const viewReport = async (
  request: ReportViewRequest,
  source: Dsaf001ReportSource,
): Promise<ReportViewProviderResult> => {
  const receiptNumber = extractReceiptNumber(request.receipt);

  if (receiptNumber === undefined) {
    throw new ReportViewProviderError({
      code: "source_parse_failure",
      message: dsaf001ReportMessages.shellChanged,
      retryable: false,
      providerId,
    });
  }

  const shell = await selectShell(
    source,
    receiptNumber,
    request.documentId,
    extractInitialDocumentQuery(request.receipt, receiptNumber),
  );
  const contentPlan = resolveReportContentPlan({
    shell,
    sectionId: request.sectionId,
    providerId,
  });
  const warnings: ReportViewWarning[] = [];
  const selectedSection =
    contentPlan.kind === "section" ? contentPlan.section : undefined;
  const contentResult =
    contentPlan.kind === "tocOnly"
      ? undefined
      : await buildReportContent({
          source,
          locator: contentPlan.locator,
          scope: contentPlan.kind,
          maxBytes: request.maxBytes,
          ...(contentPlan.kind === "section"
            ? { section: contentPlan.section }
            : {}),
        });

  if (contentResult?.warning !== undefined) {
    warnings.push(contentResult.warning);
  }

  if (contentPlan.kind === "document" && request.sectionId === undefined) {
    warnings.push({
      code: "no_toc_returned_document",
      message:
        "DART did not provide a table of contents for this document, so the selected document HTML was returned.",
    });
  }

  const navigation = buildReportNavigation(shell, selectedSection);
  const content = contentResult?.content;

  return {
    receipt: {
      receiptNumber,
    },
    document: toPublicDocument(shell.selectedDocument),
    documents: shell.documents.map(toPublicDocument),
    toc: shell.toc.map(toPublicTocNode),
    ...(content === undefined ? {} : { content }),
    ...(navigation === undefined ? {} : { navigation }),
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: {
        system: "dart",
        surface: "dsaf001",
        endpoints:
          content === undefined
            ? {
                shell: source.endpoints.shell,
              }
            : {
                shell: source.endpoints.shell,
                content: source.endpoints.content,
              },
      },
      tocSource: shell.toc.length > 0 ? "dart" : "none",
      outputFormat: "html",
    },
    references: {
      viewerUrl: shell.sourceUrl,
    },
    warnings,
  };
};

export const createDsaf001ReportViewProvider = (
  source: Dsaf001ReportSource = defaultDsaf001ReportSource,
): ReportViewProvider => ({
  view: async (request) => {
    try {
      return await viewReport(request, source);
    } catch (error) {
      throw toDsaf001ReportProviderError(error);
    }
  },
});

export const dsaf001ReportViewProvider = createDsaf001ReportViewProvider();

export const toDsaf001ReportProviderError = (
  error: unknown,
): ReportViewProviderError => {
  if (error instanceof ReportViewProviderError) {
    return error;
  }

  if (error instanceof SourceUnavailable) {
    return new ReportViewProviderError({
      code: "source_unavailable",
      message: error.message,
      retryable: true,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  if (error instanceof SourceChanged) {
    return new ReportViewProviderError({
      code: "source_changed",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  if (error instanceof ParseFailure) {
    return new ReportViewProviderError({
      code: "source_parse_failure",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  return new ReportViewProviderError({
    code: "internal_provider_error",
    message: dsaf001ReportMessages.internalProvider,
    retryable: false,
    providerId,
  });
};
