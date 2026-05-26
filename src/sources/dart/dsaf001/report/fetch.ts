import { createCauseDiagnostics, mergeErrorDiagnostics } from "../../../../error-diagnostics.ts";
import { ParseFailure, SourceUnavailable } from "../../errors.ts";
import { toWebResponseDiagnostics } from "../../http-diagnostics.ts";
import {
  createDartSourceTextResponse,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { parseReportShell } from "./parse-shell.ts";
import { sanitizeFetchedReportHtml } from "./sanitize-html.ts";
import type {
  SourceReportContent,
  SourceReportLocator,
  SourceReportShell,
} from "./source-model.ts";

const dartBaseUrl = "https://dart.fss.or.kr";
const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export const reportShellEndpoint = `${dartBaseUrl}/dsaf001/main.do`;
export const reportViewerEndpoint = `${dartBaseUrl}/report/viewer.do`;

const charsetFromContentType = (contentType: string | null): string => {
  const charset = /charset=([^;]+)/i.exec(contentType ?? "")?.[1]?.trim().toLowerCase();

  if (charset === "ms949" || charset === "euc-kr" || charset === "ks_c_5601-1987") {
    return "euc-kr";
  }

  return "utf-8";
};

const fetchDecodedHtml = async (url: string): Promise<DartSourceTextResponse> => {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "user-agent": chromeDesktopUserAgent,
      },
    });
  } catch (error) {
    throw new SourceUnavailable({
      message: dsaf001ReportMessages.sourceUnavailable,
      sourceUrl: url,
      diagnostics: createCauseDiagnostics(error),
    });
  }

  if (!response.ok) {
    throw new SourceUnavailable({
      message: dsaf001ReportMessages.sourceUnavailable,
      sourceUrl: url,
      diagnostics: {
        httpStatus: response.status,
        ...(response.headers.get("content-type") === null
          ? {}
          : { httpContentType: response.headers.get("content-type") ?? undefined }),
      },
    });
  }

  try {
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder(
      charsetFromContentType(response.headers.get("content-type")) as ConstructorParameters<
        typeof TextDecoder
      >[0],
    );

    const html = decoder.decode(buffer);

    return createDartSourceTextResponse(
      html,
      url,
      toWebResponseDiagnostics(response, html),
    );
  } catch (error) {
    throw new ParseFailure({
      message: dsaf001ReportMessages.htmlDecodeFailure,
      sourceUrl: url,
      diagnostics: mergeErrorDiagnostics(
        {
          httpStatus: response.status,
          ...(response.headers.get("content-type") === null
            ? {}
            : { httpContentType: response.headers.get("content-type") ?? undefined }),
        },
        createCauseDiagnostics(error),
      ),
    });
  }
};

export const buildReportShellUrl = (query: string): string =>
  `${reportShellEndpoint}?${query}`;

export const buildReportViewerUrl = (locator: SourceReportLocator): string => {
  const params = new URLSearchParams({
    rcpNo: locator.rcpNo,
    dcmNo: locator.dcmNo,
    eleId: locator.eleId,
    offset: locator.offset,
    length: locator.length,
    dtd: locator.dtd,
  });

  return `${reportViewerEndpoint}?${params.toString()}`;
};

export const fetchReportShell = async (
  receiptNumber: string,
  documentQuery?: string,
): Promise<SourceReportShell> => {
  const query = documentQuery ?? `rcpNo=${encodeURIComponent(receiptNumber)}`;
  const sourceUrl = buildReportShellUrl(query);
  const response = await fetchDecodedHtml(sourceUrl);

  return parseReportShell(response);
};

export const fetchReportContent = async (
  locator: SourceReportLocator,
): Promise<SourceReportContent> => {
  const sourceUrl = buildReportViewerUrl(locator);
  const response = await fetchDecodedHtml(sourceUrl);

  return {
    sourceUrl,
    html: sanitizeFetchedReportHtml(response.body, { baseUrl: dartBaseUrl }),
  };
};
