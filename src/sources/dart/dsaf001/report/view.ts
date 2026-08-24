import type { DartyExecutionContext } from "../../../../capabilities/types.ts";
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
import { createCauseDiagnostics } from "../../../../error-diagnostics.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
import { buildReportContent } from "./content.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { buildReportNavigation } from "./navigation.ts";
import { resolveReportContentPlan } from "./plan.ts";
import { parseReportQueryIdentity } from "./query-identity.ts";
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

const assertShellIdentity = (
  shell: SourceReportShell,
  receiptNumber: string,
): void => {
  let sourceIdentity: { readonly receiptNumber: string; readonly dcmNo: string | undefined };

  try {
    const url = new URL(shell.sourceUrl);
    const sourceReceipt = url.searchParams.get("rcpNo")?.trim();

    if (sourceReceipt === undefined || sourceReceipt.length === 0) {
      throw new Error("missing receipt");
    }

    const sourceDcmNo = url.searchParams.get("dcmNo")?.trim();
    sourceIdentity = {
      receiptNumber: sourceReceipt,
      dcmNo: sourceDcmNo === undefined || sourceDcmNo.length === 0 ? undefined : sourceDcmNo,
    };
  } catch {
    throw new ViewReportProviderError({
      code: "source_changed",
      message: dsaf001ReportMessages.shellChanged,
      retryable: false,
      providerId,
      sourceUrl: shell.sourceUrl,
    });
  }

  if (shell.receiptNumber !== receiptNumber || sourceIdentity.receiptNumber !== receiptNumber) {
    throw new ViewReportProviderError({
      code: "source_changed",
      message: dsaf001ReportMessages.shellChanged,
      retryable: false,
      providerId,
      sourceUrl: shell.sourceUrl,
    });
  }

  const selectedQueryIdentity = parseReportQueryIdentity(shell.selectedDocument.query);
  const selectedIsReturned = shell.documents.some(
    (document) => document.id === shell.selectedDocument.id,
  );
  const allDocumentsMatchReceipt = shell.documents.every(
    (document) => parseReportQueryIdentity(document.query)?.receiptNumber === receiptNumber,
  );

  if (
    !selectedIsReturned ||
    !allDocumentsMatchReceipt ||
    selectedQueryIdentity?.receiptNumber !== receiptNumber ||
    (sourceIdentity.dcmNo !== undefined && selectedQueryIdentity?.dcmNo !== sourceIdentity.dcmNo)
  ) {
    throw new ViewReportProviderError({
      code: "source_changed",
      message: dsaf001ReportMessages.shellChanged,
      retryable: false,
      providerId,
      sourceUrl: shell.sourceUrl,
    });
  }

  const expectedDcmNo = sourceIdentity.dcmNo ?? selectedQueryIdentity.dcmNo;
  const locatorMatches = (locator: { readonly rcpNo: string; readonly dcmNo: string }): boolean =>
    locator.rcpNo === receiptNumber &&
    (expectedDcmNo === undefined || locator.dcmNo === expectedDcmNo);

  if (
    (shell.initialViewLocator !== undefined && !locatorMatches(shell.initialViewLocator)) ||
    shell.toc.some((section) => {
      const visit = (entry: SourceReportSection): boolean =>
        !locatorMatches(entry.locator) || entry.children.some(visit);

      return visit(section);
    })
  ) {
    throw new ViewReportProviderError({
      code: "source_changed",
      message: dsaf001ReportMessages.shellChanged,
      retryable: false,
      providerId,
      sourceUrl: shell.sourceUrl,
    });
  }
};

const selectShell = async (
  source: Dsaf001ReportSource,
  receiptNumber: string,
  documentId: string | undefined,
  initialDocumentQuery: string | undefined,
  context: DartyExecutionContext | undefined,
): Promise<SourceReportShell> => {
  const initialShell = await source.fetchShell(
    receiptNumber,
    initialDocumentQuery,
    context,
  );

  assertShellIdentity(initialShell, receiptNumber);

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
      parameter: "documentId",
      sourceUrl: initialShell.sourceUrl,
    });
  }

  const selectedShell = await source.fetchShell(receiptNumber, document.query, context);

  assertShellIdentity(selectedShell, receiptNumber);

  if (selectedShell.selectedDocument.id !== documentId) {
    throw new ViewReportProviderError({
      code: "source_changed",
      message: dsaf001ReportMessages.shellChanged,
      retryable: false,
      providerId,
      sourceUrl: selectedShell.sourceUrl,
    });
  }

  return selectedShell;
};

const viewReport = async (
  request: ViewReportRequest,
  source: Dsaf001ReportSource,
  context?: DartyExecutionContext,
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
    context,
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
          ...(context === undefined ? {} : { context }),
        });

  if (contentResult?.warning !== undefined) {
    warnings.push(contentResult.warning);
  }

  if (contentPlan.kind === "document" && request.sectionId === undefined) {
    warnings.push({
      code: "no_toc_returned_document",
      message:
        "DART did not return a table of contents for this document; selected document content was returned instead. Use content.window to continue paging the document if needed.",
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
  view: async (request, context) => {
    try {
      return await viewReport(request, source, context);
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
    diagnostics: createCauseDiagnostics(error),
  });
};
