import { Effect } from "effect";

import { createCauseDiagnostics } from "../../../../error-diagnostics.ts";
import { searchCompanyResultCopy } from "../../../../capabilities/search-company/copy.ts";
import type {
  SearchCompanyItem,
  SearchCompanyRequest,
} from "../../../../capabilities/search-company/contract.ts";
import {
  SearchCompanyProviderError,
  type SearchCompanyProvider,
  type SearchCompanyProviderResult,
} from "../../../../capabilities/search-company/provider.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
import { toDsae001CompanyDetailUrl } from "../urls.ts";
import { searchCompanySourcePage, searchUrl } from "./fetch.ts";
import { dsae001CompanyMessages } from "./messages.ts";
import type { SourceCompanyRow, SourceCompanySearchPage } from "./source-model.ts";
import type { SourceCompanyReplayInput } from "./replay-schema.ts";

export { searchUrl } from "./fetch.ts";

const providerId = "dart-dsae001-company";

export const observedSearchCompanyBehavior = {
  searchMode: "company",
  callerControlsPageSize: true,
  maxObservedPageSize: 45,
  observationStatus: "observed",
} as const;

const toSearchCompanyItem = (row: SourceCompanyRow): SearchCompanyItem => ({
  companyCode: row.companyCode,
  companyName: row.companyName,
  stockCode: row.stockCode,
  marketKind: row.marketKind,
  marketLabel: row.marketLabel,
  references: {
    detailEndpoint: toDsae001CompanyDetailUrl(row.companyCode),
  },
  evidence: {
    rawCompanyLinkHref: row.rawCompanyLinkHref,
    rawMarketBadgeText: row.rawMarketBadgeText,
  },
});

export const toDsae001CompanyProviderResult = (
  page: SourceCompanySearchPage,
): SearchCompanyProviderResult => {
  const droppedItemCount = page.droppedRowCount;

  return {
    pagination: page.pagination,
    items: page.rows.map(toSearchCompanyItem),
    metadata: {
      fetchedAt: page.fetchedAt,
      source: {
        system: "dart",
        surface: "dsae001",
        endpoint: page.sourceUrl,
      },
      sourceBehavior: observedSearchCompanyBehavior,
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
              message: searchCompanyResultCopy.partialRowsDropped(droppedItemCount),
              droppedItemCount,
            },
          ],
  };
};

export const toDsae001CompanyReplayInput = (
  request: SearchCompanyRequest,
): SourceCompanyReplayInput => ({
  currentPage: request.page,
  maxResults: request.pageSize,
  searchType: "1",
  textCrpNm: request.companyName,
});

export const searchDsae001Company = (request: SearchCompanyRequest) =>
  searchCompanySourcePage(toDsae001CompanyReplayInput(request)).pipe(
    Effect.map(toDsae001CompanyProviderResult),
    Effect.mapError(toDsae001CompanyProviderError),
  );

export const dsae001CompanyProvider: SearchCompanyProvider = {
  search: (request) => Effect.runPromise(searchDsae001Company(request)),
};

export const toDsae001CompanyProviderError = (
  error: unknown,
): SearchCompanyProviderError => {
  const sourceError = toCommonDartSourceProviderError(
    error,
    providerId,
    (fields) => new SearchCompanyProviderError(fields),
  );

  if (sourceError !== undefined) {
    return sourceError;
  }

  return new SearchCompanyProviderError({
    code: "internal_provider_error",
    message: dsae001CompanyMessages.internalProvider,
    retryable: false,
    providerId,
    diagnostics: createCauseDiagnostics(error),
  });
};
