import { formatViewReportExpectedMaxBytes } from "./view-report/constants.ts";

export type InvalidRequestForRecoveryHint = {
  readonly code: string;
  readonly parameter: string;
  readonly reason?: string | undefined;
  readonly expected?: string | undefined;
};

const companyCodeHint =
  "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again.";

const dateWindowHint =
  "Dates must be real YYYYMMDD dates, and startDate cannot be after endDate.";

const companyReportsDateWindowHint =
  "Because of DART behavior, call search-company-reports with date windows of 10 years or less.";

const returnedViewReportIdHint =
  "Call view-report again with the same receipt to get current documents[].id/toc[].id values, then use the returned value.";

const contentWindowHint =
  "contentStartByte must be an integer greater than or equal to 0. To continue a long body, pass the previous response's content.window.nextStartByte unchanged.";

const unsupportedLimitHint =
  "limit is not supported and is not a public input. search-body supports only page (1-100) and cannot control pageSize. search-company uses page and pageSize (1-45); search-company-reports uses page and pageSize (15, 30, 50, 100). view-report body length and continuation use maxBytes and contentStartByte.";

const rawDartViewerParameterHint =
  "Do not pass raw DART viewer values (dcmNo, eleId, offset, length, etc.) directly. Use documentId/sectionId and content.window.nextStartByte returned by view-report.";

const rawDartViewerParameters = new Set([
  "dcmNo",
  "eleId",
  "offset",
  "length",
  "dtd",
  "tocNo",
  "atocId",
]);

const describeExpected = (expected: string | undefined): string | undefined => {
  if (expected === undefined) {
    return undefined;
  }

  const integerRangeMatch = /^integer_between_(\d+)_and_(\d+)$/.exec(expected);
  if (integerRangeMatch !== null) {
    return `integer between ${integerRangeMatch[1]} and ${integerRangeMatch[2]}`;
  }

  if (expected === "date_YYYYMMDD") {
    return "real date in YYYYMMDD format";
  }

  if (expected === "date_range_start_lte_end") {
    return "YYYYMMDD date range where startDate is not after endDate";
  }

  if (expected === "integer") {
    return "integer";
  }

  if (expected.startsWith("one_of:")) {
    return expected.slice("one_of:".length).split(",").join(", ");
  }

  return expected;
};

export const getInvalidRequestRecoveryHint = (
  error: InvalidRequestForRecoveryHint,
): string | undefined => {
  switch (error.parameter) {
    case "companyCode":
      return companyCodeHint;
    case "startDate":
    case "endDate":
      return error.reason === "date_range_too_wide"
        ? companyReportsDateWindowHint
        : dateWindowHint;
    case "page": {
      const expected = describeExpected(error.expected) ?? "integer greater than or equal to 1";
      return `page must be ${expected}. If the page is out of range, retry with a smaller page number.`;
    }
    case "pageSize": {
      const expected = describeExpected(error.expected) ?? "an accepted integer";
      return `pageSize must be ${expected}.`;
    }
    case "receipt":
      return "Pass receiptNumber or viewerUrl from search-body/search-company-reports results as receipt.";
    case "documentId":
    case "sectionId":
      return returnedViewReportIdHint;
    case "maxBytes":
      return `maxBytes must be ${formatViewReportExpectedMaxBytes()}. Start low and increase only when needed.`;
    case "contentStartByte":
      return contentWindowHint;
    case "limit":
      return unsupportedLimitHint;
    case "disclosureTypes":
      return "Pass known DART 공시상세유형 detailed codes (A001=사업보고서, A002=반기보고서, A003=분기보고서, I001=수시공시, etc.) as an array. If you do not know the code, use the disclosure-types operation or darty disclosure-types --query <term>, and put report-title text in reportName.";
    case "industryCode":
      return 'Pass "all", a DART industry code such as 612=전기 통신업, or a ROOTdddd DART industry tree root. Use "all" if the industry is unknown.';
    case "corporationType":
      return "Use one of all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), or E(기타법인).";
    case "closingAccountsMonth":
      return "Use all or a two-digit fiscal closing month code from 01 through 12. Example: January is 01.";
    default:
      return error.code === "unknown_parameter" &&
        rawDartViewerParameters.has(error.parameter)
        ? rawDartViewerParameterHint
        : undefined;
  }
};

export const getViewReportNotFoundRecoveryHint = (
  parameter: string | undefined,
): string | undefined =>
  parameter === "documentId" || parameter === "sectionId"
    ? returnedViewReportIdHint
    : undefined;

export const getCompanyNotFoundRecoveryHint = (): string => companyCodeHint;

export const getExecutionFailureRecoveryHint = (
  code: string,
  retryable: boolean,
): string | undefined => {
  switch (code) {
    case "source_unavailable":
      return "Check DART availability and retry later. If DART is reachable in a browser, report a Darty bug with diagnostics.";
    case "source_changed":
    case "source_parse_failure":
      return "DART may have changed its response shape. Report a Darty bug with the command input and diagnostics.";
    case "internal_error":
    case "internal_provider_error":
      return retryable
        ? "Retry the Darty command later; the failure appears transient. If it repeats, report a Darty bug with the returned diagnostics."
        : "Report a Darty bug with the command input and diagnostics.";
    default:
      return retryable
        ? "Retry the Darty command later; the failure appears transient. If it repeats, report a Darty bug with the returned diagnostics."
        : undefined;
  }
};
