import { Schema } from "effect";

import type {
  ContentsSearchItem,
  ContentsSearchMetadata,
  ContentsSearchPagination,
  ContentsSearchReferences,
  ContentsSearchRequest,
  ContentsSearchResult,
  ContentsSearchWarning,
} from "./contract.ts";

export type ContentsSearchProviderResult = {
  readonly pagination: ContentsSearchPagination;
  readonly items: readonly ContentsSearchItem[];
  readonly metadata: ContentsSearchMetadata;
  readonly references: ContentsSearchReferences;
  readonly warnings: readonly ContentsSearchWarning[];
};

export class ContentsSearchProviderError extends Schema.TaggedError<ContentsSearchProviderError>()(
  "ContentsSearchProviderError",
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

export type ContentsSearchProvider = {
  readonly search: (
    request: ContentsSearchRequest,
  ) => Promise<ContentsSearchProviderResult>;
};

export const buildContentsSearchResult = (
  request: ContentsSearchRequest,
  providerResult: ContentsSearchProviderResult,
): ContentsSearchResult => ({
  result: {
    request,
    pagination: providerResult.pagination,
    items: providerResult.items,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
  warnings: providerResult.warnings,
});
