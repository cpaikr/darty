import { Schema } from "effect";

import type { DartyExecutionContext } from "../types.ts";
import { DartyErrorDiagnosticsSchema } from "../../error-diagnostics.ts";
import { includesSourceEvidence } from "../response-detail.ts";
import { searchBodyResultCopy } from "./copy.ts";
import type {
  SearchBodyItem,
  SearchBodyMetadata,
  SearchBodyPagination,
  SearchBodyReferences,
  SearchBodyRequest,
  SearchBodyResult,
  SearchBodyWarning,
} from "./contract.ts";

export type SearchBodyProviderResult = {
  readonly pagination: SearchBodyPagination;
  readonly items: readonly SearchBodyItem[];
  readonly metadata: SearchBodyMetadata;
  readonly references: SearchBodyReferences;
  readonly warnings: readonly SearchBodyWarning[];
};

export class SearchBodyProviderError extends Schema.TaggedError<SearchBodyProviderError>()(
  "SearchBodyProviderError",
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
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}

export type SearchBodyProvider = {
  readonly search: (
    request: SearchBodyRequest,
    context?: DartyExecutionContext,
  ) => Promise<SearchBodyProviderResult>;
};

/**
 * Reattaches the normalized public request to the provider-owned payload so
 * transports receive one capability-owned result envelope.
 */
const projectSearchBodyItem = (
  item: SearchBodyItem,
  request: SearchBodyRequest,
): SearchBodyItem => {
  if (includesSourceEvidence(request.detail)) {
    return item;
  }

  const { evidence: _evidence, filing, ...conciseItem } = item;
  const { documentNumber: _documentNumber, ...conciseFiling } = filing;

  return {
    ...conciseItem,
    filing: conciseFiling,
  };
};

const getNoResultsWarnings = (
  providerResult: SearchBodyProviderResult,
): readonly SearchBodyWarning[] =>
  providerResult.pagination.totalCount === 0 && providerResult.items.length === 0
    ? [
        {
          code: "no_results",
          message: searchBodyResultCopy.noResults,
        },
      ]
    : [];

export const buildSearchBodyResult = (
  request: SearchBodyRequest,
  providerResult: SearchBodyProviderResult,
): SearchBodyResult => ({
  result: {
    request,
    pagination: providerResult.pagination,
    items: providerResult.items.map((item) => projectSearchBodyItem(item, request)),
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
  warnings: [...providerResult.warnings, ...getNoResultsWarnings(providerResult)],
});
