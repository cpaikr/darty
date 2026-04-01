import * as cheerio from "cheerio";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import {
  ContentsSearchResult,
  type ContentsSearchRow,
  type ContentsSearchPagination,
} from "../models.ts";
import type { ContentsSearchInput } from "../contracts.ts";

const absoluteUrl = (href: string): string =>
  new URL(href, "https://dart.fss.or.kr").toString();

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const noResultsMessage = "조회 결과가 없습니다.";

const parseNumber = (value: string): number | undefined => {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 0) {
    return undefined;
  }

  return Number.parseInt(digits, 10);
};

const parseHrefParams = (href: string): URLSearchParams =>
  new URL(absoluteUrl(href)).searchParams;

const parseCorpId = (href: string | undefined): string | undefined => {
  if (href === undefined) {
    return undefined;
  }

  const match = href.match(/openCorpInfoNew\('([^']+)'/);
  return match?.[1];
};

/**
 * The info column currently encodes two bracketed labels followed by a freeform
 * presenter segment. The raw cell text is preserved because only the label order
 * is observed, not formally guaranteed.
 */
const parseInfoCell = (
  rawInfo: string,
): Pick<
  ContentsSearchRow,
  "disclosureTypeLabel" | "contentTypeLabel" | "presenterName" | "rawInfoText"
> => {
  const labels = [...rawInfo.matchAll(/\[([^\]]+)\]/g)].map((match) =>
    collapseWhitespace(match[1] ?? ""),
  );
  const presenterMatch = rawInfo.match(/제출인\s*:\s*(.+)$/);

  return {
    disclosureTypeLabel: labels[0] || undefined,
    contentTypeLabel: labels[1] || undefined,
    presenterName: presenterMatch
      ? collapseWhitespace(presenterMatch[1] ?? "")
      : undefined,
    rawInfoText: rawInfo,
  };
};

/**
 * Splits the display report name into the stable segments that downstream
 * consumers are likely to filter on while preserving the original string.
 *
 * This intentionally avoids deeper normalization because attachment-style rows
 * can append meaningful trailing text after the reporting period.
 */
const parseReportParts = (
  reportText: string,
): Pick<
  ContentsSearchRow,
  "reportNameRaw" | "reportModifier" | "reportTitle" | "reportPeriod" | "reportNameSuffix"
> => {
  const modifierMatch = reportText.match(/^\[([^\]]+)\]\s*/);
  const reportModifier = modifierMatch?.[1];
  const withoutModifier = reportText.replace(/^\[[^\]]+\]\s*/, "");
  const periodMatch = withoutModifier.match(/\(([^()]+)\)/);
  const reportPeriod = periodMatch?.[1];
  const reportTitle = collapseWhitespace(
    periodMatch
      ? withoutModifier.slice(0, periodMatch.index ?? withoutModifier.length)
      : withoutModifier,
  );
  const reportNameSuffix = collapseWhitespace(
    periodMatch
      ? withoutModifier.slice((periodMatch.index ?? 0) + periodMatch[0].length)
      : "",
  );

  return {
    reportNameRaw: reportText,
    reportModifier,
    reportTitle,
    reportPeriod,
    reportNameSuffix: reportNameSuffix || undefined,
  };
};

const parseDate = (value: string): string => {
  const trimmed = collapseWhitespace(value);
  const match = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (match === null) {
    return trimmed;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
};

/**
 * Extracts page-level counters from the surrounding fragment. Missing `totalCnt`
 * is treated as a source-contract break because downstream callers rely on it to
 * distinguish empty results from parser loss.
 */
const parsePagination = (
  $: cheerio.CheerioAPI,
  sourceUrl: string,
): Effect.Effect<ContentsSearchPagination, SourceChanged> =>
  Effect.gen(function* () {
    const totalCountValue =
      $("#totalCnt").attr("value") ?? $("#searchCnt").text() ?? "";
    const totalCount = parseNumber(totalCountValue);
    const pageInfoText = $(".pageInfo").first().text();
    const pageInfoMatch = pageInfoText.match(/\[(\d+)\/(\d+)\]/);

    if (totalCount === undefined) {
      return yield* Effect.fail(
        new SourceChanged({
          message: "DART search response no longer exposes totalCnt.",
          sourceUrl,
        }),
      );
    }

    const currentPage = pageInfoMatch
      ? Number.parseInt(pageInfoMatch[1] ?? "1", 10)
      : 1;
    const totalPages = pageInfoMatch
      ? Number.parseInt(pageInfoMatch[2] ?? "0", 10)
      : 0;

    return {
      currentPage,
      totalPages,
      totalCount,
      returnedCount: 0,
    };
  });

const hasNoResultsPlaceholder = ($: cheerio.CheerioAPI): boolean => {
  const tbody = $("table.tbWideList tbody").first();
  const directCellText = collapseWhitespace(
    tbody
      .children("td[colspan]")
      .toArray()
      .map((cell) => $(cell).text())
      .join(" "),
  );
  const wrappedCellText = collapseWhitespace(
    tbody
      .children("tr")
      .children("td[colspan]")
      .toArray()
      .map((cell) => $(cell).text())
      .join(" "),
  );

  return (
    directCellText === noResultsMessage || wrappedCellText === noResultsMessage
  );
};

const parseRows = (
  $: cheerio.CheerioAPI,
  sourceUrl: string,
): Effect.Effect<ReadonlyArray<ContentsSearchRow>, ParseFailure> =>
  Effect.try({
    try: () => {
      if (hasNoResultsPlaceholder($)) {
        return [];
      }

      return $("table.tbWideList tbody tr")
        .toArray()
        .map((row) => {
          const element = $(row);
          const companyLink = element.find("a.company").first();
          const reportLink = element.find("a.second").first();
          const snippetCell = element.find("td").eq(0);
          const infoCell = element.find("td.info").first();
          const dateCell = element.find("td.date").first();
          const href = reportLink.attr("href");

          if (href === undefined) {
            throw new Error("Missing filing viewer link in search result row.");
          }

          const params = parseHrefParams(href);
          const rcpNo = params.get("rcpNo");

          if (rcpNo === null) {
            throw new Error("Missing rcpNo in filing viewer link.");
          }

          const rawReportText = collapseWhitespace(reportLink.text());
          const reportParts = parseReportParts(rawReportText);
          const infoParts = parseInfoCell(collapseWhitespace(infoCell.text()));

          return {
            companyName: collapseWhitespace(companyLink.text()),
            companyMarketLabel:
              collapseWhitespace(
                element.find(".companyName > span[title]").first().attr("title") ?? "",
              ) || undefined,
            corpCik: parseCorpId(companyLink.attr("href")),
            ...reportParts,
            rcpNo,
            dcmNo: params.get("dcmNo") ?? undefined,
            snippetHtml: snippetCell.html()?.trim() ?? "",
            snippetText: collapseWhitespace(snippetCell.text()),
            disclosureTypeLabel: infoParts.disclosureTypeLabel,
            contentTypeLabel: infoParts.contentTypeLabel,
            presenterName: infoParts.presenterName,
            rawInfoText: infoParts.rawInfoText,
            viewerPath: href,
            viewerUrl: absoluteUrl(href),
            receiptDate: parseDate(dateCell.text()),
          } satisfies ContentsSearchRow;
        });
    },
    catch: (error) =>
      new ParseFailure({
        message: error instanceof Error ? error.message : "Failed to parse DART rows.",
        sourceUrl,
      }),
  });

/**
 * Parses the HTML fragment returned by `dsab007/search.ax` for `option=contents`.
 *
 * The parser preserves the raw report-name string and only extracts a few stable
 * segments from it. Attachment-style rows already show that aggressive
 * normalization would lose information needed by later callers.
 */
export const parseContentsSearchResponse = (
  html: string,
  request: ContentsSearchInput,
  sourceUrl: string,
): Effect.Effect<
  Schema.Schema.Type<typeof ContentsSearchResult>,
  SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const $ = cheerio.load(html);
    const results = yield* parseRows($, sourceUrl);
    const pagination = yield* parsePagination($, sourceUrl);

    return yield* Schema.decodeUnknown(ContentsSearchResult)({
      request,
      pagination: {
        ...pagination,
        returnedCount: results.length,
      },
      rows: results,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
    });
  }).pipe(
    Effect.mapError((error) =>
      error instanceof ParseFailure || error instanceof SourceChanged
        ? error
        : new ParseFailure({
            message: "Parsed DART response did not match the expected schema.",
            sourceUrl,
          }),
    ),
  );
