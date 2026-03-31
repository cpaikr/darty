import { Schema } from "effect";

const DateString = Schema.String.pipe(
  Schema.pattern(/^\d{8}$/),
  Schema.annotations({
    identifier: "DateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const Dsab007Option = Schema.Literal("contents");
export type Dsab007Option = typeof Dsab007Option.Type;

/**
 * Observed in live `/dsab007/search.ax` contents fragments on 2026-03-31:
 * `clickSort(this, 'DATE')` and `clickSort(this, 'rpt_nm')`.
 */
export const dsab007ContentsSortFields = ["DATE", "rpt_nm"] as const;
export const Dsab007ContentsSortField = Schema.Literal(
  ...dsab007ContentsSortFields,
);
export type Dsab007ContentsSortField = typeof Dsab007ContentsSortField.Type;

/**
 * Observed in live `/dsab007/search.ax` contents fragments on 2026-03-31:
 * active sort anchors render `오름차순`/`내림차순`, matching `asc`/`desc`.
 */
export const dsab007ContentsSortDirections = ["asc", "desc"] as const;
export const Dsab007ContentsSortDirection = Schema.Literal(
  ...dsab007ContentsSortDirections,
);
export type Dsab007ContentsSortDirection =
  typeof Dsab007ContentsSortDirection.Type;

/**
 * Low-level request contract for the implemented `dsab007` contents mode.
 *
 * This intentionally stays close to DART field names so other `dsab007` modes can
 * share the same execution core. Callers should treat this as a replay contract,
 * not as a guarantee that DART will honor every supplied field exactly.
 */
export const Dsab007ContentsSearchInput = Schema.Struct({
  option: Dsab007Option,
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  maxResults: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  maxLinks: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  sort: Dsab007ContentsSortField,
  sortType: Dsab007ContentsSortDirection,
  keyword: Schema.NonEmptyString,
  startDate: DateString,
  endDate: DateString,
  textCrpCik: Schema.optional(Schema.NonEmptyString),
  textCrpNm: Schema.optional(Schema.NonEmptyString),
  textPresenterNm: Schema.optional(Schema.NonEmptyString),
  lateKeyword: Schema.optional(Schema.NonEmptyString),
  flrCik: Schema.optional(Schema.NonEmptyString),
  dspTypeTab: Schema.optional(Schema.NonEmptyString),
  tocSrch: Schema.optional(Schema.NonEmptyString),
  docType: Schema.optional(Schema.NonEmptyString),
  reportName: Schema.optional(Schema.NonEmptyString),
  decadeType: Schema.optional(Schema.NonEmptyString),
});
export type Dsab007ContentsSearchInput = typeof Dsab007ContentsSearchInput.Type;
