export const viewReportContentWindowLimits = {
  defaultMaxBytes: 50_000,
  minMaxBytes: 1_000,
  maxMaxBytes: 1_000_000,
  defaultStartByte: 0,
} as const;

export const formatViewReportByteRange = (): string =>
  `${viewReportContentWindowLimits.minMaxBytes}~${viewReportContentWindowLimits.maxMaxBytes}`;

export const formatViewReportExpectedMaxBytes = (): string =>
  `integer between ${viewReportContentWindowLimits.minMaxBytes.toLocaleString("en-US")} and ${viewReportContentWindowLimits.maxMaxBytes.toLocaleString("en-US")}`;
