import { Schema } from "effect";

const DateString = Schema.String.pipe(
  Schema.pattern(/^\d{8}$/),
  Schema.annotations({
    identifier: "DateString",
    description: "Date string in YYYYMMDD format.",
  }),
);

export const SourceCompanyReportsOption = Schema.Literal("corp");
export type SourceCompanyReportsOption = typeof SourceCompanyReportsOption.Type;

export const sourceCompanyReportsPageSizes = [15, 30, 50, 100] as const;
export const SourceCompanyReportsPageSize = Schema.Literal(
  ...sourceCompanyReportsPageSizes,
);
export type SourceCompanyReportsPageSize =
  typeof SourceCompanyReportsPageSize.Type;

export const sourceCompanyReportsSortDirections = ["asc", "desc"] as const;
export const SourceCompanyReportsSortDirection = Schema.Literal(
  ...sourceCompanyReportsSortDirections,
);
export type SourceCompanyReportsSortDirection =
  typeof SourceCompanyReportsSortDirection.Type;

export const SourceCompanyReportsReplayInput = Schema.Struct({
  option: SourceCompanyReportsOption,
  currentPage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  maxResults: SourceCompanyReportsPageSize,
  maxLinks: Schema.Int.pipe(
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  sort: Schema.Literal("date"),
  series: SourceCompanyReportsSortDirection,
  textCrpCik: Schema.String.pipe(Schema.pattern(/^\d{8}$/)),
  startDate: DateString,
  endDate: DateString,
  finalReportOnly: Schema.Boolean,
});
export type SourceCompanyReportsReplayInput =
  typeof SourceCompanyReportsReplayInput.Type;
