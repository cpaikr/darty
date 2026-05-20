import { Schema } from "effect";

import { includesSourceEvidence } from "../response-detail.ts";
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
  },
) {}

export type SearchBodyProvider = {
  readonly search: (
    request: SearchBodyRequest,
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

  const { evidence: _evidence, ...conciseItem } = item;
  return conciseItem;
};

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
  warnings: providerResult.warnings,
});
