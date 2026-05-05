import { Schema } from "effect";

export class InvalidReportViewRequest extends Schema.TaggedError<InvalidReportViewRequest>()(
  "InvalidReportViewRequest",
  {
    code: Schema.Literal(
      "missing_parameter",
      "invalid_parameter",
      "unknown_parameter",
    ),
    parameter: Schema.String,
    expected: Schema.String,
    actual: Schema.optional(Schema.Unknown),
    message: Schema.String,
  },
) {}

export class ReportViewFailure extends Schema.TaggedError<ReportViewFailure>()(
  "ReportViewFailure",
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
  },
) {}
