import * as cheerio from "cheerio";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import {
  getSourceResponseErrorContext,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { dsab007ContentsMessages } from "./messages.ts";
import {
  SourceContentsSearchPage,
  type SourceContentsPagination,
  type SourceContentsParseWarning,
  type SourceContentsRow,
} from "./source-model.ts";
import type { SourceContentsReplayInput } from "./replay-schema.ts";

const dartOrigin = "https://dart.fss.or.kr";
const viewerPath = "/dsaf001/main.do";

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

const parseViewerLink = (
  href: string,
): {
  readonly url: URL;
  readonly params: URLSearchParams;
  readonly rcpNo: string;
} => {
  let url: URL;
  try {
    url = new URL(href, dartOrigin);
  } catch {
    throw new Error(dsab007ContentsMessages.missingViewerLink);
  }

  if (
    url.origin !== dartOrigin ||
    url.pathname !== viewerPath ||
    url.username.length > 0 ||
    url.password.length > 0
  ) {
    throw new Error(dsab007ContentsMessages.missingViewerLink);
  }

  const receiptNumbers = url.searchParams.getAll("rcpNo");
  const rcpNo = receiptNumbers[0];
  if (receiptNumbers.length !== 1 || rcpNo === undefined || !/^\d{14}$/.test(rcpNo)) {
    throw new Error(dsab007ContentsMessages.missingReceiptNumber);
  }

  return { url, params: url.searchParams, rcpNo };
};

const parseCorpId = (href: string | undefined): string | undefined => {
  if (href === undefined) {
    return undefined;
  }

  const match = href.match(/openCorpInfoNew\('(\d{8})'/);
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
  response: DartSourceTextResponse,
): Effect.Effect<SourceContentsPagination, SourceChanged> =>
  Effect.gen(function* () {
    const table = $("table.tbWideList").first();
    const tbody = table.children("tbody").first();

    if (table.length === 0 || tbody.length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingResultTable,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const noResultsState = getNoResultsState($);
    const noResults = noResultsState.hasSentinel;
    if (noResultsState.mixed) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    if (!noResults && tbody.children("tr").length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const totalCountValue =
      $("#totalCnt").attr("value") ?? $("#searchCnt").text() ?? "";
    const totalCount = parseNumber(totalCountValue);
    const pageInfoText = collapseWhitespace($(".pageInfo").first().text());
    const pageInfoMatch = pageInfoText.match(
      /\[(\d+)\/(\d+)\]\s*\[총\s*([0-9,]+)건\]/,
    );

    if (totalCount === undefined) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingTotalCount,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    if (
      noResults &&
      (totalCount !== 0 ||
        (pageInfoMatch !== null &&
          Number.parseInt(pageInfoMatch[2] ?? "0", 10) !== 0))
    ) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    if (!noResults && totalCount === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    if (!noResults && pageInfoMatch === null) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007ContentsMessages.missingTotalCount,
          ...getSourceResponseErrorContext(response),
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

const getNoResultsState = (
  $: cheerio.CheerioAPI,
): {
  readonly hasSentinel: boolean;
  readonly mixed: boolean;
} => {
  const tbody = $("table.tbWideList").first().children("tbody").first();
  const rows = tbody.children("tr").toArray();
  const directSentinelCells = tbody
    .children("td[colspan]")
    .toArray()
    .filter((cell) => collapseWhitespace($(cell).text()) === noResultsMessage);
  const directDataCells = tbody
    .children("td")
    .toArray()
    .filter((cell) => !directSentinelCells.includes(cell));
  const sentinelRows = rows.filter((row) =>
    $(row)
      .children("td[colspan]")
      .toArray()
      .some((cell) => collapseWhitespace($(cell).text()) === noResultsMessage),
  );
  const sentinelSet = new Set(sentinelRows);
  const dataRows = rows.filter((row) => !sentinelSet.has(row));
  const hasSentinel = directSentinelCells.length > 0 || sentinelRows.length > 0;

  return {
    hasSentinel,
    mixed:
      hasSentinel &&
      (dataRows.length > 0 ||
        directDataCells.length > 0 ||
        directSentinelCells.length + sentinelRows.length !== 1 ||
        sentinelRows.some((row) => $(row).children("td").length !== 1)),
  };
};

const hasNoResultsPlaceholder = ($: cheerio.CheerioAPI): boolean =>
  getNoResultsState($).hasSentinel;

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

  const viewer = parseViewerLink(href);

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
    rcpNo: viewer.rcpNo,
    dcmNo: viewer.params.get("dcmNo") ?? undefined,
    snippetHtml: snippetCell.html()?.trim() ?? "",
    snippetText: collapseWhitespace(snippetCell.text()),
    disclosureTypeLabel: infoParts.disclosureTypeLabel,
    contentTypeLabel: infoParts.contentTypeLabel,
    presenterName: infoParts.presenterName,
    rawInfoText: infoParts.rawInfoText,
    viewerPath: href,
    viewerUrl: viewer.url.toString(),
    receiptDate: parseDate(dateCell.text()),
  } satisfies SourceContentsRow;
};

const parseRows = (
  $: cheerio.CheerioAPI,
  request: SourceContentsReplayInput,
): {
  readonly rows: readonly SourceContentsRow[];
  readonly warnings: readonly SourceContentsParseWarning[];
} => {
  if (hasNoResultsPlaceholder($)) {
    return { rows: [], warnings: [] };
  }

  const rows: SourceContentsRow[] = [];
  const warnings: SourceContentsParseWarning[] = [];

  $("table.tbWideList").first()
    .children("tbody")
    .first()
    .children("tr")
    .toArray()
    .forEach((row, rowIndex) => {
      try {
        const parsedRow = parseRow($, row);
        if (
          request.textCrpCik !== undefined &&
          parsedRow.corpCik !== request.textCrpCik
        ) {
          warnings.push({
            code: "row_parse_failed",
            rowIndex,
            message: dsab007ContentsMessages.companyMismatch,
          });
          return;
        }

        rows.push(parsedRow);
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
  response: DartSourceTextResponse,
  request: SourceContentsReplayInput,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceContentsSearchPage>,
  SourceChanged | ParseFailure
> => {
  const html = response.body;
  const sourceUrl = response.sourceUrl;

  return Effect.gen(function* () {
    const $ = cheerio.load(html);
    const pagination = yield* parsePagination($, response);
    const parsedRows = parseRows($, request);

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
              response,
              cause: error,
            }),
          }),
    ),
  );
};
