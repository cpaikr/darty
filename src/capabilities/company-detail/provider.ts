import { Schema } from "effect";

import type { DartyExecutionContext } from "../types.ts";
import { DartyErrorDiagnosticsSchema } from "../../error-diagnostics.ts";
import type {
  CompanyDetailInfo,
  CompanyDetailMetadata,
  CompanyDetailReferences,
  CompanyDetailRequest,
  CompanyDetailResult,
} from "./contract.ts";

export type CompanyDetailProviderResult = {
  readonly company: CompanyDetailInfo;
  readonly metadata: CompanyDetailMetadata;
  readonly references: CompanyDetailReferences;
};

export class CompanyDetailProviderError extends Schema.TaggedError<CompanyDetailProviderError>()(
  "CompanyDetailProviderError",
  {
    code: Schema.Literal(
      "not_found",
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

export type CompanyDetailProvider = {
  readonly detail: (
    request: CompanyDetailRequest,
    context?: DartyExecutionContext,
  ) => Promise<CompanyDetailProviderResult>;
};

export const buildCompanyDetailResult = (
  request: CompanyDetailRequest,
  providerResult: CompanyDetailProviderResult,
): CompanyDetailResult => ({
  result: {
    request,
    company: providerResult.company,
  },
  metadata: providerResult.metadata,
  references: providerResult.references,
});
