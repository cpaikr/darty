import { Schema } from "effect";

import { DartyErrorDiagnosticsSchema } from "../../../error-diagnostics.ts";

export class InvalidViewReportRequest extends Schema.TaggedError<InvalidViewReportRequest>()(
  "InvalidViewReportRequest",
  {
    code: Schema.Literal(
      "missing_parameter",
      "invalid_parameter",
      "unknown_parameter",
    ),
    parameter: Schema.String,
    expected: Schema.String,
    actual: Schema.optional(Schema.Unknown),
    reason: Schema.optional(Schema.String),
    message: Schema.String,
  },
) {}

export class ViewReportFailure extends Schema.TaggedError<ViewReportFailure>()(
  "ViewReportFailure",
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
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}
