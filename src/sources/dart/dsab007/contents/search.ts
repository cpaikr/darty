import { Effect } from "effect";

import { searchBodyResultCopy } from "../../../../capabilities/search-body/copy.ts";
import type {
  SearchBodyItem,
  SearchBodyRequest,
} from "../../../../capabilities/search-body/contract.ts";
import {
  SearchBodyProviderError,
  type SearchBodyProvider,
  type SearchBodyProviderResult,
} from "../../../../capabilities/search-body/provider.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
import { searchContentsSourcePage, searchUrl } from "./fetch.ts";
import { dsab007ContentsMessages } from "./messages.ts";
import type { SourceContentsRow, SourceContentsSearchPage } from "./source-model.ts";
import type { SourceContentsReplayInput } from "./replay-schema.ts";

export { searchUrl } from "./fetch.ts";

const providerId = "dart-dsab007-contents";

export const observedSearchBodyBehavior = {
  effectivePageSize: 10,
  effectivePagerWidth: 10,
  callerControlsPageSize: false,
  callerControlsPagerWidth: false,
  observationStatus: "observed",
} as const;

const toSearchBodyItem = (
  row: SourceContentsRow,
): SearchBodyItem => ({
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
): SearchBodyProviderResult => {
  const droppedItemCount = page.droppedRowCount;

  return {
    pagination: page.pagination,
    items: page.rows.map(toSearchBodyItem),
    metadata: {
      fetchedAt: page.fetchedAt,
      source: {
        system: "dart",
        surface: "dsab007",
        endpoint: page.sourceUrl,
      },
      sourceBehavior: observedSearchBodyBehavior,
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
              message: searchBodyResultCopy.partialRowsDropped(droppedItemCount),
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
  request: SearchBodyRequest,
): SourceContentsReplayInput => ({
  option: "contents",
  currentPage: request.page,
  maxResults: observedSearchBodyBehavior.effectivePageSize,
  maxLinks: observedSearchBodyBehavior.effectivePagerWidth,
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
  request: SearchBodyRequest,
) =>
  searchContentsSourcePage(toDsab007ContentsReplayInput(request)).pipe(
    Effect.map(toDsab007ContentsProviderResult),
    Effect.mapError(toDsab007ContentsProviderError),
  );

export const dsab007ContentsProvider: SearchBodyProvider = {
  search: (request) => Effect.runPromise(searchDsab007Contents(request)),
};

export const toDsab007ContentsProviderError = (
  error: unknown,
): SearchBodyProviderError => {
  const sourceError = toCommonDartSourceProviderError(
    error,
    providerId,
    (fields) => new SearchBodyProviderError(fields),
  );

  if (sourceError !== undefined) {
    return sourceError;
  }

  return new SearchBodyProviderError({
    code: "internal_provider_error",
    message: dsab007ContentsMessages.internalProvider,
    retryable: false,
    providerId,
  });
};
