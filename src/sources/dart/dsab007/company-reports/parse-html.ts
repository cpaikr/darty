import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
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

  const match = href.match(/openCorpInfoNew\('([^']+)'/);
  return match?.[1];
};

const parseReceiptNumber = (href: string): string | undefined =>
  new URL(absoluteUrl(href)).searchParams.get("rcpNo") ?? undefined;

const parsePagination = (
  $: cheerio.CheerioAPI,
  request: SourceCompanyReportsReplayInput,
  sourceUrl: string,
): Effect.Effect<SourceCompanyReportsPagination, SourceChanged> =>
  Effect.gen(function* () {
    if (hasNoResultsPlaceholder($)) {
      return {
        currentPage: request.currentPage,
        totalPages: 0,
        totalCount: 0,
        returnedCount: 0,
      };
    }

    const pageInfoText = collapseWhitespace($(".pageInfo").first().text());
    const pageInfoMatch = pageInfoText.match(
      /\[(\d+)\/(\d+)\]\s*\[총\s*([0-9,]+)건\]/,
    );

    if (pageInfoMatch === null) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingTotalCount,
          sourceUrl,
        }),
      );
    }

    const totalCount = parseNumber(pageInfoMatch[3] ?? "");
    if (totalCount === undefined) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsab007CompanyReportsMessages.missingTotalCount,
          sourceUrl,
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

const hasNoResultsPlaceholder = ($: cheerio.CheerioAPI): boolean =>
  $("table.tbList tbody td.no_data, table.tbList tbody td[colspan]")
    .toArray()
    .some((cell) => collapseWhitespace($(cell).text()) === noResultsMessage);

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
  const companyCell = cells.eq(1);
  const reportCell = cells.eq(2);
  const presenterCell = cells.eq(3);
  const receiptDateCell = cells.eq(4);
  const remarksCell = cells.eq(5);
  const companyLink = companyCell.find("a[href^='javascript:openCorpInfoNew']").first();
  const reportLink = reportCell.find("a[href^='/dsaf001/main.do']").first();
  const companyCode = parseCorpId(companyLink.attr("href"));
  const href = reportLink.attr("href");

  if (companyCode === undefined) {
    throw new Error(dsab007CompanyReportsMessages.missingCompanyCode);
  }

  if (href === undefined) {
    throw new Error(dsab007CompanyReportsMessages.missingViewerLink);
  }

  const rcpNo = parseReceiptNumber(href);
  if (rcpNo === undefined) {
    throw new Error(dsab007CompanyReportsMessages.missingReceiptNumber);
  }

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
    rcpNo,
    presenterName: presenterName || undefined,
    receiptDate: parseDate(receiptDateCell.text()),
    viewerPath: href,
    viewerUrl: absoluteUrl(href),
    remarks: parseRemarks($, remarksCell),
    rawRowText: collapseWhitespace(element.text()),
  } satisfies SourceCompanyReportsRow;
};

const parseRows = (
  $: cheerio.CheerioAPI,
): {
  readonly rows: readonly SourceCompanyReportsRow[];
  readonly warnings: readonly SourceCompanyReportsParseWarning[];
} => {
  if (hasNoResultsPlaceholder($)) {
    return { rows: [], warnings: [] };
  }

  const rows: SourceCompanyReportsRow[] = [];
  const warnings: SourceCompanyReportsParseWarning[] = [];

  $("table.tbList tbody tr")
    .toArray()
    .forEach((row, rowIndex) => {
      try {
        rows.push(parseRow($, row));
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
  html: string,
  request: SourceCompanyReportsReplayInput,
  sourceUrl: string,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceCompanyReportsSearchPage>,
  SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const $ = cheerio.load(html);
    const parsedRows = parseRows($);
    const pagination = yield* parsePagination($, request, sourceUrl);

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
          }),
    ),
  );
