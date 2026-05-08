import { Effect } from "effect";

import { searchCompanyReportsResultCopy } from "../../../../capabilities/search-company-reports/copy.ts";
import type {
  SearchCompanyReportsItem,
  SearchCompanyReportsRequest,
} from "../../../../capabilities/search-company-reports/contract.ts";
import {
  SearchCompanyReportsProviderError,
  type SearchCompanyReportsProvider,
  type SearchCompanyReportsProviderResult,
} from "../../../../capabilities/search-company-reports/provider.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
import { searchCompanyReportsSourcePage, searchUrl } from "./fetch.ts";
import { dsab007CompanyReportsMessages } from "./messages.ts";
import type {
  SourceCompanyReportsRow,
  SourceCompanyReportsSearchPage,
} from "./source-model.ts";
import type { SourceCompanyReportsReplayInput } from "./replay-schema.ts";

export { searchUrl } from "./fetch.ts";

const providerId = "dart-dsab007-company-reports";

export const observedSearchCompanyReportsBehavior = {
  searchMode: "corp",
  sortBy: "date",
  callerControlsPageSize: true,
  pageSizeChoices: [15, 30, 50, 100],
  finalReportDefault: true,
  observationStatus: "observed",
} as const;

const toSearchCompanyReportsItem = (
  row: SourceCompanyReportsRow,
): SearchCompanyReportsItem => ({
  company: {
    companyCode: row.companyCode,
    name: row.companyName,
    marketLabel: row.companyMarketLabel,
  },
  filing: {
    receiptNumber: row.rcpNo,
    reportTitle: row.reportTitle,
    receiptDate: row.receiptDate,
    presenterName: row.presenterName,
  },
  references: {
    viewerUrl: row.viewerUrl,
  },
  remarks: row.remarks,
  evidence: {
    rawRowText: row.rawRowText,
  },
});

export const toDsab007CompanyReportsProviderResult = (
  page: SourceCompanyReportsSearchPage,
): SearchCompanyReportsProviderResult => {
  const droppedItemCount = page.droppedRowCount;

  return {
    company: page.company,
    pagination: page.pagination,
    items: page.rows.map(toSearchCompanyReportsItem),
    metadata: {
      fetchedAt: page.fetchedAt,
      source: {
        system: "dart",
        surface: "dsab007",
        endpoint: page.sourceUrl,
      },
      sourceBehavior: observedSearchCompanyReportsBehavior,
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
              message:
                searchCompanyReportsResultCopy.partialRowsDropped(droppedItemCount),
              droppedItemCount,
            },
          ],
  };
};

export const toDsab007CompanyReportsReplayInput = (
  request: SearchCompanyReportsRequest,
): SourceCompanyReportsReplayInput => ({
  option: "corp",
  currentPage: request.page,
  maxResults: request.pageSize,
  maxLinks: 10,
  sort: "date",
  series: request.sortDirection,
  textCrpCik: request.companyCode,
  textPresenterNm: request.presenterName,
  reportName: request.reportName,
  publicTypes: request.disclosureTypes,
  businessCode: request.industryCode,
  corporationType: request.corporationType,
  closingAccountsMonth: request.closingAccountsMonth,
  startDate: request.startDate,
  endDate: request.endDate,
  finalReportOnly: !request.includeAllReports,
});

export const searchDsab007CompanyReports = (
  request: SearchCompanyReportsRequest,
) =>
  searchCompanyReportsSourcePage(toDsab007CompanyReportsReplayInput(request)).pipe(
    Effect.map(toDsab007CompanyReportsProviderResult),
    Effect.mapError(toDsab007CompanyReportsProviderError),
  );

export const dsab007CompanyReportsProvider: SearchCompanyReportsProvider = {
  search: (request) => Effect.runPromise(searchDsab007CompanyReports(request)),
};

export const toDsab007CompanyReportsProviderError = (
  error: unknown,
): SearchCompanyReportsProviderError => {
  const sourceError = toCommonDartSourceProviderError(
    error,
    providerId,
    (fields) => new SearchCompanyReportsProviderError(fields),
  );

  if (sourceError !== undefined) {
    return sourceError;
  }

  return new SearchCompanyReportsProviderError({
    code: "internal_provider_error",
    message: dsab007CompanyReportsMessages.internalProvider,
    retryable: false,
    providerId,
  });
};
