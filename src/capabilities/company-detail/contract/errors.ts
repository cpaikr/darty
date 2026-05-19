import { Schema } from "effect";

export class InvalidCompanyDetailRequest extends Schema.TaggedError<InvalidCompanyDetailRequest>()(
  "InvalidCompanyDetailRequest",
  {
    code: Schema.Literal(
      "missing_parameter",
      "invalid_parameter",
      "unknown_parameter",
    ),
    parameter: Schema.String,
    reason: Schema.String,
    expected: Schema.optional(Schema.String),
    actual: Schema.optional(Schema.Unknown),
    message: Schema.String,
  },
) {}

export class CompanyDetailFailure extends Schema.TaggedError<CompanyDetailFailure>()(
  "CompanyDetailFailure",
  {
    code: Schema.Literal(
      "invalid_request",
      "not_found",
      "source_unavailable",
      "source_changed",
      "source_parse_failure",
      "internal_error",
    ),
    message: Schema.String,
    retryable: Schema.Boolean,
    parameter: Schema.optional(Schema.String),
    sourceUrl: Schema.optional(Schema.String),
    recoveryHint: Schema.optional(Schema.String),
  },
) {}
