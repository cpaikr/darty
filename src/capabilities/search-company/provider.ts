import { Schema } from "effect";

import { searchCompanyResultCopy } from "./copy.ts";
import type {
  SearchCompanyItem,
  SearchCompanyMetadata,
  SearchCompanyPagination,
  SearchCompanyReferences,
  SearchCompanyRequest,
  SearchCompanyResult,
  SearchCompanyWarning,
} from "./contract.ts";

export type SearchCompanyProviderResult = {
  readonly pagination: SearchCompanyPagination;
  readonly items: readonly SearchCompanyItem[];
  readonly metadata: SearchCompanyMetadata;
  readonly references: SearchCompanyReferences;
  readonly warnings: readonly SearchCompanyWarning[];
};

export class SearchCompanyProviderError extends Schema.TaggedError<SearchCompanyProviderError>()(
  "SearchCompanyProviderError",
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

export type SearchCompanyProvider = {
  readonly search: (
    request: SearchCompanyRequest,
  ) => Promise<SearchCompanyProviderResult>;
};

const getNoResultsWarnings = (
  providerResult: SearchCompanyProviderResult,
): readonly SearchCompanyWarning[] =>
  providerResult.pagination.totalCount === 0 && providerResult.items.length === 0
    ? [
        {
          code: "no_results",
          message: searchCompanyResultCopy.noResults,
        },
      ]
    : [];

export const buildSearchCompanyResult = (
  request: SearchCompanyRequest,
  providerResult: SearchCompanyProviderResult,
): SearchCompanyResult => ({
  result: {
    request,
    pagination: providerResult.pagination,
    items: providerResult.items,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
  warnings: [...providerResult.warnings, ...getNoResultsWarnings(providerResult)],
});
