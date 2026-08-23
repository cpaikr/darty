import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import {
  getSourceResponseErrorContext,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { dsab007CompanyReportsMessages } from "./messages.ts";
import {
  SourceCompanyReportsSearchPage,
  type SourceCompanyReportsCompany,
  type SourceCompanyReportsPagination,
  type SourceCompanyReportsParseWarning,
  type SourceCompanyReportsRemark,
  type SourceCompanyReportsRow,
} from "./source-model.ts";
import type { SourceCompanyReportsReplayInput } from "./replay-schema.ts";

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

const parseDate = (value: string): string => {
  const trimmed = collapseWhitespace(value);
  const match = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (match === null) {
    return trimmed;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
};

const parseCorpId = (href: string | undefined): string | undefined => {
  if (href === undefined) {
    return undefined;
  }

  const match = href.match(/openCorpInfoNew\('(\d{8})'/);
  return match?.[1];
};

const parseViewerLink = (
  href: string,
): {
  readonly url: URL;
  readonly rcpNo: string;
} => {
  let url: URL;
  try {
    url = new URL(href, dartOrigin);
  } catch {
    throw new Error(dsab007CompanyReportsMessages.missingViewerLink);
  }

  if (
    url.origin !== dartOrigin ||
    url.pathname !== viewerPath ||
    url.username.length > 0 ||
    url.password.length > 0
  ) {
    throw new Error(dsab007CompanyReportsMessages.missingViewerLink);
  }

  const receiptNumbers = url.searchParams.getAll("rcpNo");
  const rcpNo = receiptNumbers[0];
  if (receiptNumbers.length !== 1 || rcpNo === undefined || !/^\d{14}$/.test(rcpNo)) {
    throw new Error(dsab007CompanyReportsMessages.missingReceiptNumber);
  }

  return { url, rcpNo };
};

const parsePagination = (
  $: cheerio.CheerioAPI,
  request: SourceCompanyReportsReplayInput,
  response: DartSourceTextResponse,
): Effect.Effect<SourceCompanyReportsPagination, SourceChanged> =>
  Effect.gen(function* () {
    const table = $("table.tbList").first();
    const tbody = table.children("tbody").first();

    if (table.length === 0 || tbody.length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingResultTable,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const noResultsState = getNoResultsState($);
    if (noResultsState.mixed) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    if (noResultsState.hasSentinel) {
      const pageInfoText = collapseWhitespace($(".pageInfo").first().text());
      const pageInfoMatch = pageInfoText.match(
        /\[(\d+)\/(\d+)\]\s*\[총\s*([0-9,]+)건\]/,
      );
      if (
        pageInfoMatch !== null &&
        (parseNumber(pageInfoMatch[3] ?? "") !== 0 ||
          Number.parseInt(pageInfoMatch[2] ?? "0", 10) !== 0)
      ) {
        return yield* Effect.fail(
          new SourceChanged({
            message: dsab007CompanyReportsMessages.missingTotalCount,
            ...getSourceResponseErrorContext(response),
          }),
        );
      }

      return {
        currentPage: request.currentPage,
        totalPages: 0,
        totalCount: 0,
        returnedCount: 0,
      };
    }

    if (tbody.children("tr").length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const pageInfoText = collapseWhitespace($(".pageInfo").first().text());
    const pageInfoMatch = pageInfoText.match(
      /\[(\d+)\/(\d+)\]\s*\[총\s*([0-9,]+)건\]/,
    );

    if (pageInfoMatch === null) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingTotalCount,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const totalCount = parseNumber(pageInfoMatch[3] ?? "");
    const totalPages = Number.parseInt(pageInfoMatch[2] ?? "0", 10);
    if (totalCount === undefined || totalCount === 0 || totalPages === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingTotalCount,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    return {
      currentPage: Number.parseInt(pageInfoMatch[1] ?? "1", 10),
      totalPages: Number.parseInt(pageInfoMatch[2] ?? "0", 10),
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
  const tbody = $("table.tbList").first().children("tbody").first();
  const rows = tbody.children("tr").toArray();
  const directSentinelCells = tbody
    .children("td.no_data, td[colspan]")
    .toArray()
    .filter((cell) => collapseWhitespace($(cell).text()) === noResultsMessage);
  const directDataCells = tbody
    .children("td")
    .toArray()
    .filter((cell) => !directSentinelCells.includes(cell));
  const sentinelRows = rows.filter((row) =>
    $(row)
      .children("td.no_data, td[colspan]")
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

const parseRemarks = (
  $: cheerio.CheerioAPI,
  remarksCell: cheerio.Cheerio<AnyNode>,
): readonly SourceCompanyReportsRemark[] => {
  const spanRemarks = remarksCell
    .find("span")
    .toArray()
    .map((span) => ({
      text: collapseWhitespace($(span).text()),
      title: collapseWhitespace($(span).attr("title") ?? "") || undefined,
    }))
    .filter((remark) => remark.text.length > 0 || remark.title !== undefined);

  if (spanRemarks.length > 0) {
    return spanRemarks;
  }

  const text = collapseWhitespace(remarksCell.text());
  return text.length === 0 ? [] : [{ text }];
};

const parseRow = (
  $: cheerio.CheerioAPI,
  row: unknown,
): SourceCompanyReportsRow => {
  const element = $(row as never);
  const cells = element.children("td");
  if (cells.length !== 6) {
    throw new Error(dsab007CompanyReportsMessages.rowParseFailed);
  }

  const companyCell = cells.eq(1);
  const reportCell = cells.eq(2);
  const presenterCell = cells.eq(3);
  const receiptDateCell = cells.eq(4);
  const remarksCell = cells.eq(5);
  const companyLink = companyCell.find("a[href^='javascript:openCorpInfoNew']").first();
  const reportLink = reportCell.find("a[href]").first();
  const companyCode = parseCorpId(companyLink.attr("href"));
  const href = reportLink.attr("href");

  if (companyCode === undefined) {
    throw new Error(dsab007CompanyReportsMessages.missingCompanyCode);
  }

  if (href === undefined) {
    throw new Error(dsab007CompanyReportsMessages.missingViewerLink);
  }

  const viewer = parseViewerLink(href);

  const reportTitle = collapseWhitespace(reportLink.text());
  if (reportTitle.length === 0) {
    throw new Error(dsab007CompanyReportsMessages.missingReportTitle);
  }

  const presenterName = collapseWhitespace(
    presenterCell.attr("title") ?? presenterCell.text(),
  );

  return {
    companyCode,
    companyName: collapseWhitespace(companyLink.text()),
    companyMarketLabel:
      collapseWhitespace(companyCell.find("span[title]").first().attr("title") ?? "") ||
      undefined,
    reportTitle,
    rcpNo: viewer.rcpNo,
    presenterName: presenterName || undefined,
    receiptDate: parseDate(receiptDateCell.text()),
    viewerPath: href,
    viewerUrl: viewer.url.toString(),
    remarks: parseRemarks($, remarksCell),
    rawRowText: collapseWhitespace(element.text()),
  } satisfies SourceCompanyReportsRow;
};

const parseRows = (
  $: cheerio.CheerioAPI,
  request: SourceCompanyReportsReplayInput,
): {
  readonly rows: readonly SourceCompanyReportsRow[];
  readonly warnings: readonly SourceCompanyReportsParseWarning[];
} => {
  if (hasNoResultsPlaceholder($)) {
    return { rows: [], warnings: [] };
  }

  const rows: SourceCompanyReportsRow[] = [];
  const warnings: SourceCompanyReportsParseWarning[] = [];

  $("table.tbList").first()
    .children("tbody")
    .first()
    .children("tr")
    .toArray()
    .forEach((row, rowIndex) => {
      try {
        const parsedRow = parseRow($, row);
        if (parsedRow.companyCode !== request.textCrpCik) {
          warnings.push({
            code: "row_parse_failed",
            rowIndex,
            message: dsab007CompanyReportsMessages.companyMismatch,
          });
          return;
        }

        rows.push(parsedRow);
      } catch {
        warnings.push({
          code: "row_parse_failed",
          rowIndex,
          message: dsab007CompanyReportsMessages.rowParseFailed,
        });
      }
    });

  return { rows, warnings };
};

const parseCompany = (
  request: SourceCompanyReportsReplayInput,
  rows: readonly SourceCompanyReportsRow[],
): SourceCompanyReportsCompany => {
  const firstRow = rows[0];

  return {
    companyCode: request.textCrpCik,
    name: firstRow?.companyName,
    marketLabel: firstRow?.companyMarketLabel,
  };
};

export const parseCompanyReportsSearchHtml = (
  response: DartSourceTextResponse,
  request: SourceCompanyReportsReplayInput,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceCompanyReportsSearchPage>,
  SourceChanged | ParseFailure
> => {
  const html = response.body;
  const sourceUrl = response.sourceUrl;

  return Effect.gen(function* () {
    const $ = cheerio.load(html);
    const pagination = yield* parsePagination($, request, response);
    const parsedRows = parseRows($, request);

    return yield* Schema.decodeUnknown(SourceCompanyReportsSearchPage)({
      request,
      company: parseCompany(request, parsedRows.rows),
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
            message: dsab007CompanyReportsMessages.sourceSchemaMismatch,
            sourceUrl,
            diagnostics: toParseFailureDiagnostics({
              reason: dsab007CompanyReportsMessages.sourceSchemaMismatch,
              response,
              cause: error,
            }),
          }),
    ),
  );
};
