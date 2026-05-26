import * as cheerio from "cheerio";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import { dsab007ContentsMessages } from "./messages.ts";
import {
  SourceContentsSearchPage,
  type SourceContentsPagination,
  type SourceContentsParseWarning,
  type SourceContentsRow,
} from "./source-model.ts";
import type { SourceContentsReplayInput } from "./replay-schema.ts";

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

const parseInfoCell = (
  rawInfo: string,
): Pick<
  SourceContentsRow,
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

const parseReportParts = (
  reportText: string,
): Pick<
  SourceContentsRow,
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

const parsePagination = (
  $: cheerio.CheerioAPI,
  sourceUrl: string,
): Effect.Effect<SourceContentsPagination, SourceChanged> =>
  Effect.gen(function* () {
    const totalCountValue =
      $("#totalCnt").attr("value") ?? $("#searchCnt").text() ?? "";
    const totalCount = parseNumber(totalCountValue);
    const pageInfoText = $(".pageInfo").first().text();
    const pageInfoMatch = pageInfoText.match(/\[(\d+)\/(\d+)\]/);

    if (totalCount === undefined) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingTotalCount,
          sourceUrl,
        }),
      );
    }

    return {
      currentPage: pageInfoMatch
        ? Number.parseInt(pageInfoMatch[1] ?? "1", 10)
        : 1,
      totalPages: pageInfoMatch
        ? Number.parseInt(pageInfoMatch[2] ?? "0", 10)
        : 0,
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

const parseRow = (
  $: cheerio.CheerioAPI,
  row: unknown,
): SourceContentsRow => {
  const element = $(row as never);
  const companyLink = element.find("a.company").first();
  const reportLink = element.find("a.second").first();
  const snippetCell = element.find("td").eq(0);
  const infoCell = element.find("td.info").first();
  const dateCell = element.find("td.date").first();
  const href = reportLink.attr("href");

  if (href === undefined) {
    throw new Error(dsab007ContentsMessages.missingViewerLink);
  }

  const params = parseHrefParams(href);
  const rcpNo = params.get("rcpNo");

  if (rcpNo === null) {
    throw new Error(dsab007ContentsMessages.missingReceiptNumber);
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
  } satisfies SourceContentsRow;
};

const parseRows = (
  $: cheerio.CheerioAPI,
): {
  readonly rows: readonly SourceContentsRow[];
  readonly warnings: readonly SourceContentsParseWarning[];
} => {
  if (hasNoResultsPlaceholder($)) {
    return { rows: [], warnings: [] };
  }

  const rows: SourceContentsRow[] = [];
  const warnings: SourceContentsParseWarning[] = [];

  $("table.tbWideList tbody tr")
    .toArray()
    .forEach((row, rowIndex) => {
      try {
        rows.push(parseRow($, row));
      } catch {
        warnings.push({
          code: "row_parse_failed",
          rowIndex,
          message: dsab007ContentsMessages.rowParseFailed,
        });
      }
    });

  return { rows, warnings };
};

export const parseContentsSearchHtml = (
  html: string,
  request: SourceContentsReplayInput,
  sourceUrl: string,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceContentsSearchPage>,
  SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const $ = cheerio.load(html);
    const parsedRows = parseRows($);
    const pagination = yield* parsePagination($, sourceUrl);

    return yield* Schema.decodeUnknown(SourceContentsSearchPage)({
      request,
      pagination: {
        ...pagination,
        returnedCount: parsedRows.rows.length,
      },
      rows: parsedRows.rows,
      warnings: parsedRows.warnings,
      droppedRowCount: parsedRows.warnings.length,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
    });
  }).pipe(
    Effect.mapError((error) =>
      error instanceof ParseFailure || error instanceof SourceChanged
        ? error
        : new ParseFailure({
            message: dsab007ContentsMessages.sourceSchemaMismatch,
            sourceUrl,
            diagnostics: toParseFailureDiagnostics({
              reason: dsab007ContentsMessages.sourceSchemaMismatch,
              responseText: html,
              cause: error,
            }),
          }),
    ),
  );
