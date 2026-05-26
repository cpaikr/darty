import { Schema } from "effect";

import { DartyErrorDiagnosticsSchema } from "../../../error-diagnostics.ts";

export class InvalidDisclosureTypesRequest extends Schema.TaggedError<InvalidDisclosureTypesRequest>()(
  "InvalidDisclosureTypesRequest",
  {
    code: Schema.Literal("invalid_parameter", "unknown_parameter"),
    parameter: Schema.String,
    reason: Schema.String,
    expected: Schema.optional(Schema.String),
    actual: Schema.optional(Schema.Unknown),
    message: Schema.String,
  },
) {}

export class DisclosureTypesFailure extends Schema.TaggedError<DisclosureTypesFailure>()(
  "DisclosureTypesFailure",
  {
    code: Schema.Literal("invalid_request", "internal_error"),
    message: Schema.String,
    retryable: Schema.Boolean,
    parameter: Schema.optional(Schema.String),
    recoveryHint: Schema.optional(Schema.String),
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}
