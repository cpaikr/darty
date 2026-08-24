import type { DartyExecutionContext } from "../../../../capabilities/types.ts";
import { SourceChanged } from "../../errors.ts";
import {
  dartTransportLimits,
  fetchDartWebTextResponse,
} from "../../transport.ts";
import type { DartSourceTextResponse } from "../../source-response.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { parseReportShell } from "./parse-shell.ts";
import { sanitizeFetchedReportHtml } from "./sanitize-html.ts";
import type {
  SourceReportContent,
  SourceReportLocator,
  SourceReportShell,
} from "./source-model.ts";

const dartBaseUrl = "https://dart.fss.or.kr";

export const reportShellEndpoint = `${dartBaseUrl}/dsaf001/main.do`;
export const reportViewerEndpoint = `${dartBaseUrl}/report/viewer.do`;

const fetchDecodedHtml = async (
  url: string,
  maxBytes: number,
  context?: DartyExecutionContext,
): Promise<DartSourceTextResponse> => {
  return fetchDartWebTextResponse(
    url,
    {
      sourceUrl: url,
      unavailableMessage: dsaf001ReportMessages.sourceUnavailable,
      parseFailureMessage: dsaf001ReportMessages.htmlDecodeFailure,
      maxBytes,
      responseKind: "html",
    },
    context?.signal,
  );
};

export const buildReportShellUrl = (query: string): string => {
  const input = new URLSearchParams(query);
  const url = new URL(reportShellEndpoint);
  const receiptNumber = input.get("rcpNo");
  const documentNumber = input.get("dcmNo");

  if (receiptNumber === null || !/^\d{14}$/.test(receiptNumber)) {
    throw new SourceChanged({
      message: dsaf001ReportMessages.shellChanged,
      sourceUrl: reportShellEndpoint,
    });
  }

  url.searchParams.set("rcpNo", receiptNumber);
  if (documentNumber !== null && /^\d+$/.test(documentNumber)) {
    url.searchParams.set("dcmNo", documentNumber);
  }

  return url.toString();
};

export const buildReportViewerUrl = (locator: SourceReportLocator): string => {
  if (
    !/^\d{14}$/.test(locator.rcpNo) ||
    !/^\d+$/.test(locator.dcmNo) ||
    !/^\d+$/.test(locator.eleId) ||
    !/^\d+$/.test(locator.offset) ||
    !/^\d+$/.test(locator.length) ||
    !/^[A-Za-z0-9._-]+$/.test(locator.dtd)
  ) {
    throw new SourceChanged({
      message: dsaf001ReportMessages.shellChanged,
      sourceUrl: reportViewerEndpoint,
    });
  }

  const url = new URL(reportViewerEndpoint);
  const params: Record<string, string> = {
    rcpNo: locator.rcpNo,
    dcmNo: locator.dcmNo,
    eleId: locator.eleId,
    offset: locator.offset,
    length: locator.length,
    dtd: locator.dtd,
  };

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

export const fetchReportShell = async (
  receiptNumber: string,
  documentQuery?: string,
  context?: DartyExecutionContext,
): Promise<SourceReportShell> => {
  const query = documentQuery ?? `rcpNo=${encodeURIComponent(receiptNumber)}`;
  const sourceUrl = buildReportShellUrl(query);
  const response = await fetchDecodedHtml(
    sourceUrl,
    dartTransportLimits.reportShell,
    context,
  );

  return parseReportShell(response);
};

export const fetchReportContent = async (
  locator: SourceReportLocator,
  context?: DartyExecutionContext,
): Promise<SourceReportContent> => {
  const sourceUrl = buildReportViewerUrl(locator);
  const response = await fetchDecodedHtml(
    sourceUrl,
    dartTransportLimits.reportContent,
    context,
  );

  return {
    sourceUrl,
    html: sanitizeFetchedReportHtml(response.body, { baseUrl: dartBaseUrl }),
  };
};
