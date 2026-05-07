import { Effect } from "effect";

import type { CompanyDetailRequest } from "../../../../capabilities/company-detail/contract.ts";
import {
  CompanyDetailProviderError,
  type CompanyDetailProvider,
  type CompanyDetailProviderResult,
} from "../../../../capabilities/company-detail/provider.ts";
import { SourceNotFound } from "../../errors.ts";
import { toCommonDartSourceProviderError } from "../../provider-errors.ts";
import { fetchCompanyDetailPage } from "./fetch.ts";
import { dsae001DetailMessages } from "./messages.ts";
import type { SourceCompanyDetailPage } from "./source-model.ts";

const providerId = "dart-dsae001-company-detail";

export const toDsae001CompanyDetailProviderResult = (
  page: SourceCompanyDetailPage,
): CompanyDetailProviderResult => ({
  company: page.company,
  metadata: {
    fetchedAt: page.fetchedAt,
    source: {
      system: "dart",
      surface: "dsae001",
      endpoint: page.sourceUrl,
    },
    completeness: "complete",
  },
  references: {
    detailUrl: page.sourceUrl,
  },
});

export const viewDsae001CompanyDetail = (request: CompanyDetailRequest) =>
  fetchCompanyDetailPage(request.companyCode).pipe(
    Effect.map(toDsae001CompanyDetailProviderResult),
    Effect.mapError(toDsae001CompanyDetailProviderError),
  );

export const dsae001CompanyDetailProvider: CompanyDetailProvider = {
  detail: (request) => Effect.runPromise(viewDsae001CompanyDetail(request)),
};

export const toDsae001CompanyDetailProviderError = (
  error: unknown,
): CompanyDetailProviderError => {
  const sourceError = toCommonDartSourceProviderError(
    error,
    providerId,
    (fields) => new CompanyDetailProviderError(fields),
  );

  if (sourceError !== undefined) {
    return sourceError;
  }

  if (error instanceof SourceNotFound) {
    return new CompanyDetailProviderError({
      code: "not_found",
      message: error.message,
      retryable: false,
      providerId,
      sourceUrl: error.sourceUrl,
    });
  }

  return new CompanyDetailProviderError({
    code: "internal_provider_error",
    message: dsae001DetailMessages.internalProvider,
    retryable: false,
    providerId,
  });
};
