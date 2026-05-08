import { Schema } from "effect";

import type {
  SearchCompanyReportsCompany,
  SearchCompanyReportsItem,
  SearchCompanyReportsMetadata,
  SearchCompanyReportsPagination,
  SearchCompanyReportsReferences,
  SearchCompanyReportsRequest,
  SearchCompanyReportsResult,
  SearchCompanyReportsWarning,
} from "./contract.ts";

export type SearchCompanyReportsProviderResult = {
  readonly company: SearchCompanyReportsCompany;
  readonly pagination: SearchCompanyReportsPagination;
  readonly items: readonly SearchCompanyReportsItem[];
  readonly metadata: SearchCompanyReportsMetadata;
  readonly references: SearchCompanyReportsReferences;
  readonly warnings: readonly SearchCompanyReportsWarning[];
};

export class SearchCompanyReportsProviderError extends Schema.TaggedError<SearchCompanyReportsProviderError>()(
  "SearchCompanyReportsProviderError",
  {
    code: Schema.Literal(
      "source_unavailable",
      "source_changed",
      "source_parse_failure",
      "internal_provider_error",
    ),
    message: Schema.String,
    retryable: Schema.Boolean,
    providerId: Schema.String,
    sourceUrl: Schema.optional(Schema.String),
  },
) {}

export type SearchCompanyReportsProvider = {
  readonly search: (
    request: SearchCompanyReportsRequest,
  ) => Promise<SearchCompanyReportsProviderResult>;
};

export const buildSearchCompanyReportsResult = (
  request: SearchCompanyReportsRequest,
  providerResult: SearchCompanyReportsProviderResult,
): SearchCompanyReportsResult => ({
  result: {
    request,
    company: providerResult.company,
    pagination: providerResult.pagination,
    items: providerResult.items,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
  warnings: providerResult.warnings,
});
