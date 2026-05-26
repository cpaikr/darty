import { Schema } from "effect";

import { DartyErrorDiagnosticsSchema } from "../../error-diagnostics.ts";
import { normalizeResponseDetail } from "../response-detail.ts";
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
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}

export type CompanyRssProvider = {
  readonly rss: (request: CompanyRssRequest) => Promise<CompanyRssProviderResult>;
};

const projectCompanyRssChannel = (
  channel: CompanyRssChannel,
  request: CompanyRssRequest,
): CompanyRssChannel => {
  if (normalizeResponseDetail(request.detail) !== "concise") {
    return channel;
  }

  return {
    title: channel.title,
    link: channel.link,
  };
};

const projectCompanyRssItem = (
  item: CompanyRssItem,
  request: CompanyRssRequest,
): CompanyRssItem => {
  if (normalizeResponseDetail(request.detail) !== "concise") {
    return item;
  }

  const { guid: _guid, ...conciseItem } = item;
  return conciseItem;
};

export const buildCompanyRssResult = (
  request: CompanyRssRequest,
  providerResult: CompanyRssProviderResult,
): CompanyRssResult => ({
  result: {
    request,
    channel: projectCompanyRssChannel(providerResult.channel, request),
    items: providerResult.items.map((item) => projectCompanyRssItem(item, request)),
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
});
