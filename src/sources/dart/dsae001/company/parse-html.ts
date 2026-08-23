import * as cheerio from "cheerio";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import {
  getSourceResponseErrorContext,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { dsae001CompanyMessages } from "./messages.ts";
import {
  SourceCompanySearchPage,
  type SourceCompanyMarketKind,
  type SourceCompanyPagination,
  type SourceCompanyParseWarning,
  type SourceCompanyRow,
} from "./source-model.ts";
import type { SourceCompanyReplayInput } from "./replay-schema.ts";

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const parseNumber = (value: string): number | undefined => {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 0) {
    return undefined;
  }

  return Number.parseInt(digits, 10);
};

const parseCompanyCode = (href: string): string | undefined => {
  const match = href.match(/select\('([0-9]{8})'\)/);
  return match?.[1];
};

const parseStockCode = (value: string): string | undefined => {
  const stockCode = collapseWhitespace(value);

  if (stockCode.length === 0) {
    return undefined;
  }

  if (!/^\d{6}$/.test(stockCode)) {
    throw new Error(dsae001CompanyMessages.invalidStockCode);
  }

  return stockCode;
};

const toMarketKind = (
  marketLabel: string | undefined,
  badgeText: string | undefined,
): SourceCompanyMarketKind => {
  if (marketLabel === "유가증권시장" || badgeText === "유") {
    return "kospi";
  }
  if (marketLabel === "코스닥시장" || badgeText === "코") {
    return "kosdaq";
  }
  if (marketLabel === "코넥스시장" || badgeText === "넥") {
    return "konex";
  }
  if (marketLabel === "기타법인" || badgeText === "기") {
    return "etc";
  }

  return "unknown";
};

const parsePagination = (
  $: cheerio.CheerioAPI,
  request: SourceCompanyReplayInput,
  response: DartSourceTextResponse,
): Effect.Effect<SourceCompanyPagination, SourceChanged> =>
  Effect.gen(function* () {
    const table = $("#corpTable").first();
    const tbody = table.children("tbody").first();

    if (table.length === 0 || tbody.length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsae001CompanyMessages.missingResultTable,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const rows = tbody.children("tr");
    const sentinelRows = rows.filter((_, row) => $(row).hasClass("noData"));
    const noResults = sentinelRows.length > 0;
    if (
      (noResults &&
        (sentinelRows.length !== 1 ||
          rows.length !== 1 ||
          $(sentinelRows.get(0)).children("td").length !== 1)) ||
      (!noResults && rows.length === 0)
    ) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsae001CompanyMessages.missingResultRows,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const pageInfoText = collapseWhitespace($(".pageInfo").first().text());
    const pageInfoMatch = pageInfoText.match(
      /\[(\d+)\/(\d+)\]\s*\[총\s*([0-9,]+)건\]/,
    );

    if (pageInfoMatch === null) {
      if (noResults) {
        return {
          currentPage: request.currentPage,
          totalPages: 0,
          totalCount: 0,
          returnedCount: 0,
        };
      }

      return yield* Effect.fail(
        new SourceChanged({
          message: dsae001CompanyMessages.missingTotalCount,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const totalCount = parseNumber(pageInfoMatch[3] ?? "");
    const totalPages = Number.parseInt(pageInfoMatch[2] ?? "0", 10);
    if (
      totalCount === undefined ||
      (noResults && (totalCount !== 0 || totalPages !== 0)) ||
      (!noResults && (totalCount === 0 || totalPages === 0))
    ) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsae001CompanyMessages.missingTotalCount,
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

const parseRow = ($: cheerio.CheerioAPI, row: unknown): SourceCompanyRow => {
  const element = $(row as never);
  const link = element.find("a[href^='javascript:select']").first();
  const href = link.attr("href") ?? "";
  const companyCode = parseCompanyCode(href);

  if (companyCode === undefined) {
    throw new Error(dsae001CompanyMessages.missingCompanyCode);
  }

  const companyName = collapseWhitespace(link.text());
  if (companyName.length === 0) {
    throw new Error(dsae001CompanyMessages.missingCompanyName);
  }

  const marketBadge = element.find("span[title]").first();
  const marketLabel = collapseWhitespace(marketBadge.attr("title") ?? "") || undefined;
  const badgeText = collapseWhitespace(marketBadge.text()) || undefined;
  const stockCode = parseStockCode(element.children("td").eq(1).text());

  return {
    companyCode,
    companyName,
    stockCode,
    marketKind: toMarketKind(marketLabel, badgeText),
    marketLabel,
    rawCompanyLinkHref: href,
    rawMarketBadgeText: badgeText,
  };
};

const parseRows = (
  $: cheerio.CheerioAPI,
): {
  readonly rows: readonly SourceCompanyRow[];
  readonly warnings: readonly SourceCompanyParseWarning[];
} => {
  if (
    $("#corpTable").first().children("tbody").first().children("tr.noData")
      .length > 0
  ) {
    return { rows: [], warnings: [] };
  }

  const rows: SourceCompanyRow[] = [];
  const warnings: SourceCompanyParseWarning[] = [];

  $("#corpTable").first()
    .children("tbody")
    .first()
    .children("tr")
    .toArray()
    .forEach((row, rowIndex) => {
      try {
        rows.push(parseRow($, row));
      } catch {
        warnings.push({
          code: "row_parse_failed",
          rowIndex,
          message: dsae001CompanyMessages.rowParseFailed,
        });
      }
    });

  return { rows, warnings };
};

export const parseCompanySearchHtml = (
  response: DartSourceTextResponse,
  request: SourceCompanyReplayInput,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceCompanySearchPage>,
  SourceChanged | ParseFailure
> => {
  const html = response.body;
  const sourceUrl = response.sourceUrl;

  return Effect.gen(function* () {
    const $ = cheerio.load(html);
    const pagination = yield* parsePagination($, request, response);
    const parsedRows = parseRows($);

    return yield* Schema.decodeUnknown(SourceCompanySearchPage)({
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
            message: dsae001CompanyMessages.sourceSchemaMismatch,
            sourceUrl,
            diagnostics: toParseFailureDiagnostics({
              reason: dsae001CompanyMessages.sourceSchemaMismatch,
              response,
              cause: error,
            }),
          }),
    ),
  );
};
