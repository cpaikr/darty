const dartSearchSyntaxSummary =
  'DART shared search syntax: `사과 포도`=AND, `사과|포도`=OR, `사과!포도`=NOT, `"사과 포도"`=exact phrase.';

const dartSearchSyntaxDetails =
  'DART shared search syntax: `사과 포도` finds documents containing both 사과 and 포도, `사과|포도` finds documents containing either term, `사과!포도` excludes documents containing 포도 from results for 사과, and `"사과 포도"` searches for the exact 사과/포도 order as `사과포도` or `사과 포도` with no other word or phrase between them.';

export const searchBodyFieldCopy = {
  page: {
    description: "[default: 1] DART search result page, starting at 1.",
    cliDescription: "[default: 1] DART search result page, starting at 1.",
  },
  sortBy: {
    description:
      "[default: date] Sort key for DART 본문내용 results (date=접수일자, reportName=보고서명).",
    cliDescription:
      "[default: date] Sort key for DART 본문내용 results (date=접수일자, reportName=보고서명).",
  },
  sortDirection: {
    description: "[default: desc] Sort direction for the selected sort key.",
    cliDescription: "[default: desc] Sort direction for the selected sort key.",
  },
  keyword: {
    description:
      `[required] Search term for DART 공시통합검색 본문내용 mode. ${dartSearchSyntaxDetails}`,
    cliDescription:
      `[required] Search term for DART 공시통합검색 본문내용 mode. ${dartSearchSyntaxSummary}`,
  },
  startDate: {
    description: "[required] DART search period start date (YYYYMMDD).",
    cliDescription: "[required] DART search period start date (YYYYMMDD).",
  },
  endDate: {
    description: "[required] DART search period end date (YYYYMMDD).",
    cliDescription: "[required] DART search period end date (YYYYMMDD).",
  },
  companyCode: {
    description:
      "8-digit DART company code. Free-text company names and 6-digit stock codes are not accepted.",
    cliDescription:
      "8-digit DART company code. Free-text company names are not accepted.",
  },
  presenterName: {
    description:
      "제출인명 (presenter name). Useful for ownership disclosures and 감사보고서 searches where the presenter may differ from the target company.",
    cliDescription:
      "제출인명 (presenter name). Useful when the presenter may differ from the target company.",
  },
  reportName: {
    description:
      "보고서명 (report title) filter. This maps to DART's `보고서명` field. Provide report-title text, not a body keyword (for example, 사업보고서 or 주주총회소집공고).",
    cliDescription:
      "보고서명 (report title) filter. Provide report-title text, not a body keyword (for example, 사업보고서 or 주주총회소집공고).",
  },
} as const;

export const searchBodyCliCopy = {
  summary: "Search DART 공시통합검색 본문내용.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Search DART 본문내용 matches by keyword.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ],
    },
    {
      description: "Search with a verified company code and presenter name.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--company-code",
        "01368637",
        "--presenter-name",
        "유일에너테크",
        "--sort-by",
        "reportName",
      ],
    },
  ],
  notesHeading: "Search tips",
  notes: [
    "본문내용 search is document-level keyword search. Multiple space-separated terms mean all terms exist somewhere in the same document, not necessarily in the same paragraph, table, or item.",
    "For context-sensitive searches such as key audit matters (KAM), use search-body to narrow candidates, then pass a result viewerUrl or receipt number to view-report and inspect the actual filing body.",
    "Use `--detail detailed` or `--detail raw` with `--verbose` when you need source evidence such as raw DART row text or snippet HTML. raw adds row-level evidence fields, not the full DART search HTML.",
  ],
  invalidInteger: (value: string): string =>
    `Expected an integer but received "${value}".`,
} as const;

export const searchBodyFailureCopy = {
  unexpectedSearchBody: "Unexpected internal error while searching filing bodies.",
} as const;

export const searchBodyResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `Dropped ${droppedItemCount} search result row(s) because they could not be parsed.`,
  noResults:
    "No DART 본문내용 results. DART applies document-level keywords plus explicit date/company/report filters; widen the date range or remove optional filters, then search again.",
} as const;

export const searchBodySchemaCopy = {
  dateStringDescription: "Date string in YYYYMMDD format.",
  requestDescription:
    "Semantic search input for DART 공시통합검색 `본문내용` mode. Required: keyword, startDate, endDate.",
  requestExamples: [
    {
      page: 1,
      sortBy: "date",
      sortDirection: "desc",
      detail: "concise",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: "00126380",
    },
  ],
  resultDescription: "Successful search-body result envelope with search results, metadata, source references, and warnings.",
} as const;

export const searchBodyToolCopy = {
  title: "DART body-content search",
  description:
    `Search submitted filing text through DART 공시통합검색 \`본문내용\` mode. ${dartSearchSyntaxSummary}`,
} as const;

export const searchBodyValidationCopy = {
  inputExpected: "search_body_parameters_object",
  inputMustBeObject:
    "search-body input must be an object containing semantic parameters.",
  expectedNonEmptyString: "non-empty string",
  expectedDateYYYYMMDD: "date string in YYYYMMDD format",
  expectedOneOf: (choices: readonly string[]): string => choices.join(" or "),
  expectedIntegerBetween: (minimum: number, maximum: number): string =>
    `integer between ${minimum} and ${maximum}`,
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `Missing required parameter "${parameter}". Expected ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `Parameter "${parameter}" must be a string.`,
  mustBeInteger: (parameter: string): string =>
    `Parameter "${parameter}" must be an integer.`,
  mustBeOneOf: (parameter: string, choices: readonly string[]): string =>
    `Parameter "${parameter}" must be one of: ${choices.join(", ")}.`,
  mustBeInRange: (parameter: string, minimum: number, maximum: number): string =>
    `Parameter "${parameter}" must be between ${minimum} and ${maximum}.`,
  mustNotBeEmpty: (parameter: string): string =>
    `Parameter "${parameter}" cannot be empty.`,
  mustUseDateFormat: (parameter: string): string =>
    `Parameter "${parameter}" must use YYYYMMDD format.`,
  mustBeRealDate: (parameter: string, actual: string): string =>
    `Parameter "${parameter}" must be a real date in YYYYMMDD format. "${actual}" is not a valid date.`,
  startDateMustNotBeAfterEndDate: (startDate: string, endDate: string): string =>
    `startDate cannot be after endDate. startDate=${startDate}, endDate=${endDate}.`,
  mustUseDartCompanyCode: (parameter: string): string =>
    `Parameter "${parameter}" must be an 8-digit DART company code. Company names and 6-digit stock codes are not accepted. Example: Samsung Electronics DART company code 00126380.`,
  invalidParameter: (parameter: string): string =>
    `Parameter "${parameter}" is invalid.`,
  unknownParameter: (parameter: string): string =>
    `Unknown parameter: "${parameter}".`,
} as const;
