import { Effect } from "effect";

import type {
  ContentsSearchItem,
  ContentsSearchRequest,
} from "../../../../capabilities/contents-search/contract.ts";
import {
  ContentsSearchProviderError,
  type ContentsSearchProvider,
  type ContentsSearchProviderResult,
} from "../../../../capabilities/contents-search/provider.ts";
import {
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../../errors.ts";
import { searchContentsSourcePage, searchUrl } from "./fetch.ts";
import type { SourceContentsRow, SourceContentsSearchPage } from "./source-model.ts";
import type { SourceContentsReplayInput } from "./replay-schema.ts";

export { searchUrl } from "./fetch.ts";

const providerId = "dart-dsab007-contents";

export const observedContentsSearchBehavior = {
  effectivePageSize: 10,
  effectivePagerWidth: 10,
  callerControlsPageSize: false,
  callerControlsPagerWidth: false,
  observationStatus: "observed",
} as const;

const toContentsSearchItem = (
  row: SourceContentsRow,
): ContentsSearchItem => ({
  company: {
    name: row.companyName,
    marketLabel: row.companyMarketLabel,
    companyCode: row.corpCik,
  },
  filing: {
    receiptNumber: row.rcpNo,
    documentNumber: row.dcmNo,
    reportTitle: row.reportTitle,
    reportModifier: row.reportModifier,
    reportPeriod: row.reportPeriod,
    reportNameSuffix: row.reportNameSuffix,
    receiptDate: row.receiptDate,
  },
  match: {
    snippetText: row.snippetText,
    disclosureTypeLabel: row.disclosureTypeLabel,
    contentTypeLabel: row.contentTypeLabel,
    presenterName: row.presenterName,
  },
  references: {
    viewerUrl: row.viewerUrl,
  },
  evidence: {
    reportNameRaw: row.reportNameRaw,
    rawInfoText: row.rawInfoText,
    snippetHtml: row.snippetHtml,
  },
});

export const toDsab007ContentsProviderResult = (
  page: SourceContentsSearchPage,
): ContentsSearchProviderResult => {
  const droppedItemCount = page.droppedRowCount;

  return {
    pagination: page.pagination,
    items: page.rows.map(toContentsSearchItem),
    metadata: {
      fetchedAt: page.fetchedAt,
      source: {
        system: "dart",
        surface: "dsab007",
        endpoint: page.sourceUrl,
      },
      sourceBehavior: observedContentsSearchBehavior,
      completeness: droppedItemCount > 0 ? "partial" : "complete",
      droppedItemCount,
    },
    references: {
      searchUrl,
    },
    warnings:
      droppedItemCount === 0
        ? []
        : [
            {
              code: "partial_rows_dropped",
              message: `${droppedItemCount} search result row(s) could not be parsed and were omitted.`,
              droppedItemCount,
            },
          ],
  };
};

/**
 * Translates the public semantic request into the narrower replay contract that
 * matches DART's `option=contents` surface. Replay-only knobs stay internal
 * here even when DART still requires them on the POST body.
 */
export const toDsab007ContentsReplayInput = (
  request: ContentsSearchRequest,
): SourceContentsReplayInput => ({
  option: "contents",
  currentPage: request.page,
  maxResults: observedContentsSearchBehavior.effectivePageSize,
  maxLinks: observedContentsSearchBehavior.effectivePagerWidth,
  sort: request.sortBy === "reportName" ? "rpt_nm" : "DATE",
  sortType: request.sortDirection,
  keyword: request.keyword,
  startDate: request.startDate,
  endDate: request.endDate,
  textCrpCik: request.companyCode,
  textCrpNm: undefined,
  textPresenterNm: request.presenterName,
  reportName: request.reportName,
});

export const searchDsab007Contents = (
  request: ContentsSearchRequest,
) =>
  searchContentsSourcePage(toDsab007ContentsReplayInput(request)).pipe(
    Effect.map(toDsab007ContentsProviderResult),
    Effect.mapError(toDsab007ContentsProviderError),
  );

export const dsab007ContentsProvider: ContentsSearchProvider = {
  search: (request) => Effect.runPromise(searchDsab007Contents(request)),
};

export const toDsab007ContentsProviderError = (
  error: unknown,
): ContentsSearchProviderError => {
  if (error instanceof SourceUnavailable) {
    return new ContentsSearchProviderError({
      code: "source_unavailable",
      message: error.message,
      retryable: true,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  if (error instanceof SourceChanged) {
    return new ContentsSearchProviderError({
      code: "source_changed",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  if (error instanceof ParseFailure) {
    return new ContentsSearchProviderError({
      code: "source_parse_failure",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  return new ContentsSearchProviderError({
    code: "internal_provider_error",
    message:
      error instanceof Error
        ? error.message
        : "Provider failed due to an unexpected internal error.",
    retryable: false,
    providerId,
  });
};
