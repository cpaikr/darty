import { Schema } from "effect";

export const SourceCompanyReplayInput = Schema.Struct({
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  maxResults: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(45),
  ),
  searchType: Schema.Literal("1"),
  textCrpNm: Schema.String,
});
export type SourceCompanyReplayInput = typeof SourceCompanyReplayInput.Type;
