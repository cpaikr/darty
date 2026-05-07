import { Schema } from "effect";

import type {
  CompanyRssChannel,
  CompanyRssItem,
  CompanyRssMetadata,
  CompanyRssReferences,
  CompanyRssRequest,
  CompanyRssResult,
} from "./contract.ts";

export type CompanyRssProviderResult = {
  readonly channel: CompanyRssChannel;
  readonly items: readonly CompanyRssItem[];
  readonly metadata: CompanyRssMetadata;
  readonly references: CompanyRssReferences;
};

export class CompanyRssProviderError extends Schema.TaggedError<CompanyRssProviderError>()(
  "CompanyRssProviderError",
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

export type CompanyRssProvider = {
  readonly rss: (request: CompanyRssRequest) => Promise<CompanyRssProviderResult>;
};

export const buildCompanyRssResult = (
  request: CompanyRssRequest,
  providerResult: CompanyRssProviderResult,
): CompanyRssResult => ({
  result: {
    request,
    channel: providerResult.channel,
    items: providerResult.items,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
});
