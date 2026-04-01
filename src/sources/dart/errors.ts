import { Schema } from "effect";

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
  },
) {}

export class SourceChanged extends Schema.TaggedError<SourceChanged>()(
  "SourceChanged",
  {
    message: Schema.String,
    sourceUrl: Schema.String,
  },
) {}

export class ParseFailure extends Schema.TaggedError<ParseFailure>()(
  "ParseFailure",
  {
    message: Schema.String,
    sourceUrl: Schema.String,
  },
) {}
