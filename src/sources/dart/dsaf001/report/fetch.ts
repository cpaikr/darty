import * as cheerio from "cheerio";

import { ParseFailure, SourceUnavailable } from "../../errors.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { parseReportShell } from "./parse-shell.ts";
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

const toAbsoluteUrl = (url: string): string => {
  try {
    return new URL(url, dartBaseUrl).toString();
  } catch {
    return url;
  }
};

const charsetFromContentType = (contentType: string | null): string => {
  const charset = /charset=([^;]+)/i.exec(contentType ?? "")?.[1]?.trim().toLowerCase();

  if (charset === "ms949" || charset === "euc-kr" || charset === "ks_c_5601-1987") {
    return "euc-kr";
  }

  return "utf-8";
};

const fetchDecodedHtml = async (url: string): Promise<string> => {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "user-agent": chromeDesktopUserAgent,
      },
    });
  } catch {
    throw new SourceUnavailable({
      message: dsaf001ReportMessages.sourceUnavailable,
      sourceUrl: url,
    });
  }

  if (!response.ok) {
    throw new SourceUnavailable({
      message: dsaf001ReportMessages.sourceUnavailable,
      sourceUrl: url,
    });
  }

  try {
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder(
      charsetFromContentType(response.headers.get("content-type")) as ConstructorParameters<
        typeof TextDecoder
      >[0],
    );

    return decoder.decode(buffer);
  } catch {
    throw new ParseFailure({
      message: dsaf001ReportMessages.htmlDecodeFailure,
      sourceUrl: url,
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
  const html = await fetchDecodedHtml(sourceUrl);

  return parseReportShell(html, sourceUrl);
};

const sanitizeHtml = (html: string): string => {
  const $ = cheerio.load(html);

  $("script, style, link, meta, object, embed, iframe").remove();
  $("*").each((_, element) => {
    if (!("attribs" in element)) {
      return;
    }

    const attributes = { ...element.attribs } as Record<string, string>;

    for (const [name, value] of Object.entries(attributes)) {
      const lowerName = name.toLowerCase();
      const lowerValue = value.trim().toLowerCase();

      if (lowerName.startsWith("on")) {
        $(element).removeAttr(name);
        continue;
      }

      if ((lowerName === "href" || lowerName === "src") && lowerValue.length > 0) {
        if (/^(javascript|data):/.test(lowerValue)) {
          $(element).removeAttr(name);
        } else {
          $(element).attr(name, toAbsoluteUrl(value));
        }
      }
    }
  });

  return $("body").length > 0 ? $("body").html() ?? "" : $.root().html() ?? "";
};

export const fetchReportContent = async (
  locator: SourceReportLocator,
): Promise<SourceReportContent> => {
  const sourceUrl = buildReportViewerUrl(locator);
  const html = await fetchDecodedHtml(sourceUrl);

  return {
    sourceUrl,
    html: sanitizeHtml(html),
  };
};
