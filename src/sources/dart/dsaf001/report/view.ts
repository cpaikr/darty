import type {
  ViewReportDocument,
  ViewReportRequest,
  ViewReportTocNode,
  ViewReportWarning,
} from "../../../../capabilities/view-report/contract.ts";
import { extractReceiptNumber } from "../../../../capabilities/view-report/contract.ts";
import {
  ViewReportProviderError,
  type ViewReportProvider,
  type ViewReportProviderResult,
} from "../../../../capabilities/view-report/provider.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
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
): ViewReportDocument => ({
  id: document.id,
  title: document.title,
  kind: document.kind,
  selected: document.selected,
});

const toPublicTocNode = (section: SourceReportSection): ViewReportTocNode => ({
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
    throw new ViewReportProviderError({
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
  request: ViewReportRequest,
  source: Dsaf001ReportSource,
): Promise<ViewReportProviderResult> => {
  const receiptNumber = extractReceiptNumber(request.receipt);

  if (receiptNumber === undefined) {
    throw new ViewReportProviderError({
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
  const warnings: ViewReportWarning[] = [];
  const selectedSection =
    contentPlan.kind === "section" ? contentPlan.section : undefined;
  const contentResult =
    contentPlan.kind === "tocOnly"
      ? undefined
      : await buildReportContent({
          source,
          locator: contentPlan.locator,
          scope: contentPlan.kind,
          outputFormat: request.outputFormat,
          maxBytes: request.maxBytes,
          contentStartByte: request.contentStartByte,
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
        "DART did not provide a table of contents for this document, so the selected document content was returned.",
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
    },
    references: {
      viewerUrl: shell.sourceUrl,
    },
    warnings,
  };
};

export const createDsaf001ViewReportProvider = (
  source: Dsaf001ReportSource = defaultDsaf001ReportSource,
): ViewReportProvider => ({
  view: async (request) => {
    try {
      return await viewReport(request, source);
    } catch (error) {
      throw toDsaf001ReportProviderError(error);
    }
  },
});

export const dsaf001ViewReportProvider = createDsaf001ViewReportProvider();

export const toDsaf001ReportProviderError = (
  error: unknown,
): ViewReportProviderError => {
  if (error instanceof ViewReportProviderError) {
    return error;
  }

  const sourceError = toCommonDartSourceProviderError(
    error,
    providerId,
    (fields) => new ViewReportProviderError(fields),
  );

  if (sourceError !== undefined) {
    return sourceError;
  }

  return new ViewReportProviderError({
    code: "internal_provider_error",
    message: dsaf001ReportMessages.internalProvider,
    retryable: false,
    providerId,
  });
};
