import { Effect } from "effect";

import type { CompanyRssRequest } from "../../../../capabilities/company-rss/contract.ts";
import {
  CompanyRssProviderError,
  type CompanyRssProvider,
  type CompanyRssProviderResult,
} from "../../../../capabilities/company-rss/provider.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
import { fetchCompanyRssFeed } from "./fetch.ts";
import { companyRssMessages } from "./messages.ts";
import type { SourceCompanyRssFeed } from "./source-model.ts";

const providerId = "dart-company-rss";

export const toCompanyRssProviderResult = (
  feed: SourceCompanyRssFeed,
): CompanyRssProviderResult => ({
  channel: feed.channel,
  items: feed.items,
  metadata: {
    fetchedAt: feed.fetchedAt,
    source: {
      system: "dart",
      surface: "companyRSS",
      endpoint: feed.sourceUrl,
    },
    completeness: "complete",
    itemCount: feed.items.length,
  },
  references: {
    rssUrl: feed.sourceUrl,
  },
});

export const fetchDartCompanyRss = (request: CompanyRssRequest) =>
  fetchCompanyRssFeed(request.companyCode).pipe(
    Effect.map(toCompanyRssProviderResult),
    Effect.mapError(toCompanyRssProviderError),
  );

export const dartCompanyRssProvider: CompanyRssProvider = {
  rss: (request) => Effect.runPromise(fetchDartCompanyRss(request)),
};

export const toCompanyRssProviderError = (
  error: unknown,
): CompanyRssProviderError => {
  const sourceError = toCommonDartSourceProviderError(
    error,
    providerId,
    (fields) => new CompanyRssProviderError(fields),
  );

  if (sourceError !== undefined) {
    return sourceError;
  }

  return new CompanyRssProviderError({
    code: "internal_provider_error",
    message: companyRssMessages.internalProvider,
    retryable: false,
    providerId,
  });
};
