export const searchCompanyReportsFieldCopy = {
  companyCode: {
    description:
      "[required] 8-digit DART company code. Company names and 6-digit stock codes are not accepted.",
    cliDescription:
      "[required] 8-digit DART company code. Use search-company first if you only know a company name or stock code.",
  },
  startDate: {
    description:
      "[required] DART search period start date (YYYYMMDD). search-company-reports supports at most a 10-year date window.",
    cliDescription:
      "[required] DART search period start date (YYYYMMDD). The search period is limited to 10 years.",
  },
  endDate: {
    description:
      "[required] DART search period end date (YYYYMMDD). search-company-reports supports at most a 10-year date window.",
    cliDescription:
      "[required] DART search period end date (YYYYMMDD). The search period is limited to 10 years.",
  },
  page: {
    description: "[default: 1] DART search result page, starting at 1.",
    cliDescription: "[default: 1] DART search result page, starting at 1.",
  },
  pageSize: {
    description:
      "[default: 15] Number of filings to request per page. Observed DART values are 15, 30, 50, and 100; agent-friendly values 5 and 10 are normalized to the smallest DART value, 15.",
    cliDescription:
      "[default: 15] Number of filings to request per page (15, 30, 50, 100; 5/10 normalize to 15).",
  },
  sortDirection: {
    description:
      "[default: desc] Receipt-date sort direction. The sort key is fixed internally to receipt date.",
    cliDescription:
      "[default: desc] Receipt-date sort direction (asc or desc).",
  },
  presenterName: {
    description: "제출인명 (presenter name) filter. Maps to DART's `제출인명` field.",
    cliDescription: "Narrow results by 제출인명 (presenter name).",
  },
  reportName: {
    description:
      "보고서명 (report title) filter. Maps to DART's `보고서명` field. Provide report-title text, not a disclosure type code (for example, 사업보고서).",
    cliDescription:
      "Narrow results by 보고서명 (report title), for example 사업보고서. Use --disclosure-type for disclosure type codes.",
  },
  disclosureTypes: {
    description:
      "List of DART 공시상세유형 detailed codes. Only known detailed codes are accepted. Common examples: A001(사업보고서), A002(반기보고서), A003(분기보고서), F001(감사보고서), I001(수시공시). Put report-title text such as `사업보고서` in reportName, not in this field. If you do not know the code, use darty disclosure-types --query <term> or the disclosure-types operation.",
    cliDescription:
      "Add a 공시상세유형 detailed code. Repeat for multiple codes. Examples: A001(사업보고서), A002(반기보고서), A003(분기보고서), I001(수시공시).",
  },
  industryCode: {
    description:
      "[default: all] DART industry code. `all` applies no industry filter. Observed example: 612(전기 통신업). DART industry tree root values use ROOTdddd format. If you do not know the industry code, use all.",
    cliDescription:
      "Narrow results by DART industry code. Default is all. Example: 612(전기 통신업). Use all if unknown.",
  },
  corporationType: {
    description:
      "[default: all] Corporation type filter: all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), or E(기타법인).",
    cliDescription:
      "Narrow results by corporation type (all=전체, P=유가증권시장, A=코스닥시장, N=코넥스시장, E=기타법인).",
  },
  closingAccountsMonth: {
    description:
      "[default: all] Fiscal closing month filter. Use all or a two-digit month code from 01 through 12. Example: January is 01, December is 12.",
    cliDescription:
      "Narrow results by fiscal closing month (all, 1-12, or 01-12). Values 1-9 normalize to 01-09.",
  },
  includeAllReports: {
    description:
      "[default: false] When true, disables DART's final-report filter and includes pre-correction filings.",
    cliDescription:
      "Include pre-correction filings. Default behavior applies DART's final-report filter.",
  },
} as const;

export const searchCompanyReportsCliCopy = {
  summary: "Search company-specific DART filings by DART company code.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Search recent company-specific filings with a verified DART company code.",
      argv: [
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
      ],
    },
    {
      description: "Include pre-correction filings and request 30 results per page.",
      argv: [
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
        "--page-size",
        "30",
        "--include-all-reports",
      ],
    },
    {
      description: "Narrow company filings by disclosure type and report title.",
      argv: [
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
        "--disclosure-type",
        "A001",
        "--report-name",
        "사업보고서",
      ],
    },
  ],
  notesHeading: "Search tips",
  notes: [
    "If you know the company name but not the company code, first run `darty search-company --company-name <company name>` to find the 8-digit companyCode.",
    "The search period is limited to 10 years. Split longer ranges into windows of 10 years or less because DART can respond as if there are no results.",
    "By default, DART's final-report filter is applied. `--include-all-reports` includes pre-correction filings and may increase the total count.",
    "Use DART detailed disclosure type codes (A001=사업보고서, A002=반기보고서, A003=분기보고서, I001=수시공시, etc.). If you do not know a code, run `darty disclosure-types --query <term>`, and repeat `--disclosure-type` for multiple codes.",
    "Fiscal closing month is sent as a DART month code (01-12). CLI input such as `--closing-accounts-month 1` is normalized to `01`.",
    "Pass a result filing.receiptNumber or references.viewerUrl to `view-report` for follow-up retrieval.",
    "Use `--detail detailed` or `--detail raw` with `--verbose` when you need source evidence such as raw DART row text. raw adds row-level evidence fields, not the full DART search HTML.",
  ],
  invalidInteger: (value: string): string =>
    `Expected an integer but received "${value}".`,
} as const;

export const searchCompanyReportsFailureCopy = {
  unexpectedSearchCompanyReports:
    "Unexpected internal error while searching company filings.",
} as const;

export const searchCompanyReportsResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `Dropped ${droppedItemCount} search result row(s) because they could not be parsed.`,
  matchedDisclosureTypeAmbiguous:
    "matchedDisclosureType is ambiguous because the search used multiple disclosure type codes. Search again with exactly one disclosureTypes value when you need row-level attribution.",
  noResults:
    "No DART company filing results. Check that the search period is 10 years or less, then adjust the date window or remove reportName/presenterName/disclosureTypes/industryCode/corporationType/closingAccountsMonth filters and search again.",
} as const;

export const searchCompanyReportsSchemaCopy = {
  dateStringDescription: "Date string in YYYYMMDD format.",
  requestDescription:
    "Semantic search input that runs DART 공시통합검색 `회사명` mode with an 8-digit DART company code. Required: companyCode, startDate, endDate.",
  requestExamples: [
    {
      companyCode: "00126380",
      startDate: "20250331",
      endDate: "20260331",
      page: 1,
      pageSize: 15,
      sortDirection: "desc",
      detail: "concise",
      reportName: "사업보고서",
      disclosureTypes: [],
      industryCode: "all",
      corporationType: "all",
      closingAccountsMonth: "all",
      includeAllReports: false,
    },
  ],
  resultDescription:
    "Successful search-company-reports result envelope with company filing results, metadata, source references, and warnings.",
} as const;

export const searchCompanyReportsToolCopy = {
  title: "DART company filing search",
  description:
    "Return company-specific DART filings for an 8-digit DART company code. This operation does not resolve company names; use search-company first when you need companyCode lookup.",
} as const;

export const searchCompanyReportsValidationCopy = {
  inputExpected: "search_company_reports_parameters_object",
  inputMustBeObject:
    "search-company-reports input must be an object containing semantic parameters.",
  expectedDateYYYYMMDD: "date string in YYYYMMDD format",
  expectedIntegerBetween: (minimum: number, maximum: number): string =>
    `integer between ${minimum} and ${maximum}`,
  expectedOneOf: (choices: readonly string[]): string => choices.join(" or "),
  expectedBoolean: "boolean",
  expectedNonEmptyString: "non-empty string",
  expectedStringArray: "string array",
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `Missing required parameter "${parameter}". Expected ${expectedDescription}${
      expectedDescription.endsWith(".") ? "" : "."
    }`,
  mustBeString: (parameter: string): string =>
    `Parameter "${parameter}" must be a string.`,
  mustNotBeEmpty: (parameter: string): string =>
    `Parameter "${parameter}" cannot be empty.`,
  mustBeInteger: (parameter: string): string =>
    `Parameter "${parameter}" must be an integer.`,
  mustBeBoolean: (parameter: string): string =>
    `Parameter "${parameter}" must be a boolean.`,
  mustBeStringArray: (parameter: string): string =>
    `Parameter "${parameter}" must be a string array.`,
  mustBeInRange: (parameter: string, minimum: number, maximum: number): string =>
    `Parameter "${parameter}" must be between ${minimum} and ${maximum}.`,
  mustBeOneOf: (parameter: string, choices: readonly string[]): string =>
    `Parameter "${parameter}" must be one of: ${choices.join(", ")}.`,
  mustUseDateFormat: (parameter: string): string =>
    `Parameter "${parameter}" must use YYYYMMDD format.`,
  mustBeRealDate: (parameter: string, actual: string): string =>
    `Parameter "${parameter}" must be a real date in YYYYMMDD format. "${actual}" is not a valid date.`,
  startDateMustNotBeAfterEndDate: (startDate: string, endDate: string): string =>
    `startDate cannot be after endDate. startDate=${startDate}, endDate=${endDate}.`,
  dateRangeMustBeAtMostTenYears: (
    startDate: string,
    endDate: string,
    minimumStartDate: string,
  ): string =>
    `search-company-reports search period is limited to 10 years. startDate=${startDate}, endDate=${endDate}; the earliest allowed startDate for this endDate is ${minimumStartDate}. Split longer periods into windows of 10 years or less.`,
  mustUseDartCompanyCode: (parameter: string): string =>
    `Parameter "${parameter}" must be an 8-digit DART company code. Company names and 6-digit stock codes are not accepted. Example: Samsung Electronics DART company code 00126380.`,
  mustUseKnownPattern: (parameter: string, expected: string): string =>
    `Parameter "${parameter}" must match ${expected}.`,
  mustUseDisclosureTypeCodes: (parameter: string): string =>
    `Parameter "${parameter}" must be an array of DART 공시상세유형 detailed codes, for example ["A001"](사업보고서), ["A002"](반기보고서), ["A003"](분기보고서), or ["I001"](수시공시). Use reportName for report-title text such as "사업보고서".`,
  mustUseKnownDisclosureTypeCodes: (
    parameter: string,
    unknownCodes: readonly string[],
  ): string =>
    `Parameter "${parameter}" contains unknown DART 공시상세유형 detailed code(s): ${unknownCodes.join(", ")}. Common codes include A001=사업보고서, A002=반기보고서, A003=분기보고서, F001=감사보고서, and I001=수시공시. If you do not know the code, use the disclosure-types operation or darty disclosure-types --query, and put report-title text in reportName.`,
  mustUseIndustryCode: (parameter: string): string =>
    `Parameter "${parameter}" must be "all", a DART industry code such as 612=전기 통신업, or a ROOTdddd DART industry tree root. Use "all" if the industry is unknown.`,
  mustUseCorporationType: (parameter: string): string =>
    `Parameter "${parameter}" must be one of all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), or E(기타법인).`,
  mustUseClosingAccountsMonth: (parameter: string): string =>
    `Parameter "${parameter}" must be all or a two-digit fiscal closing month code from 01 through 12. Example: January is "01", December is "12".`,
  invalidParameter: (parameter: string): string =>
    `Parameter "${parameter}" is invalid.`,
  unknownParameter: (parameter: string): string =>
    `Unknown parameter: "${parameter}".`,
} as const;
