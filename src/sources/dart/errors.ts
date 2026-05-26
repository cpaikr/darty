import { Schema } from "effect";

import { DartyErrorDiagnosticsSchema } from "../../error-diagnostics.ts";

export class InvalidInput extends Schema.TaggedError<InvalidInput>()(
  "InvalidInput",
  {
    message: Schema.String,
  },
) {}

export class SourceUnavailable extends Schema.TaggedError<SourceUnavailable>()(
  "SourceUnavailable",
  {
    message: Schema.String,
    sourceUrl: Schema.String,
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}

export class SourceChanged extends Schema.TaggedError<SourceChanged>()(
  "SourceChanged",
  {
    message: Schema.String,
    sourceUrl: Schema.String,
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}

export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()(
  "SourceNotFound",
  {
    message: Schema.String,
    sourceUrl: Schema.String,
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}

export class ParseFailure extends Schema.TaggedError<ParseFailure>()(
  "ParseFailure",
  {
    message: Schema.String,
    sourceUrl: Schema.String,
    diagnostics: Schema.optional(DartyErrorDiagnosticsSchema),
  },
) {}
