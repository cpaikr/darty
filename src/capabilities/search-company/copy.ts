export const searchCompanyFieldCopy = {
  companyName: {
    description: "[required] Company-name search term for DART 기업개황 회사별 search. Use at least 2 characters.",
    cliDescription: "[required] Company-name search term for DART 기업개황 회사별 search. Use at least 2 characters.",
  },
  page: {
    description: "[default: 1] DART 기업개황 company-search result page, starting at 1.",
    cliDescription: "[default: 1] DART 기업개황 company-search result page, starting at 1.",
  },
  pageSize: {
    description: "[default: 15] Number of companies to request per page. The largest observed DART company-search value is 45.",
    cliDescription: "[default: 15] Number of companies to request per page (maximum 45).",
  },
} as const;

export const searchCompanyCliCopy = {
  summary: "Find 8-digit DART company codes through DART 기업개황 회사별 search.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Find an 8-digit DART company code by company name.",
      argv: ["--company-name", "삼성전자"],
    },
    {
      description: "Fetch the next page for a broad company-name search.",
      argv: ["--company-name", "삼성", "--page", "2", "--page-size", "20"],
    },
  ],
  notesHeading: "Search tips",
  notes: [
    "companyCode is DART's 8-digit company identifier embedded in company links such as select('00126380').",
    "stockCode is a 6-digit listed-company stock code shown only for listed companies; it is not the DART company code.",
  ],
  invalidInteger: (value: string): string =>
    `Expected an integer but received "${value}".`,
} as const;

export const searchCompanyFailureCopy = {
  unexpectedSearchCompany: "Unexpected internal error while searching companies.",
} as const;

export const searchCompanyResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `Dropped ${droppedItemCount} search result row(s) because they could not be parsed.`,
  noResults:
    "No DART 기업개황 company-name results. Try a shorter company-name fragment. Business registration number and corporate registration number search modes are not supported by this tool.",
} as const;

export const searchCompanySchemaCopy = {
  requestDescription:
    "Company-name search input for DART 기업개황 `회사별` mode. Required: companyName.",
  requestExamples: [{ companyName: "삼성전자", page: 1, pageSize: 15 }],
  resultDescription:
    "Successful search-company result envelope with company search results, metadata, source references, and warnings.",
} as const;

export const searchCompanyToolCopy = {
  title: "DART company search",
  description:
    "Search companies through DART 기업개황 `회사별` mode and return DART 8-digit company codes plus 6-digit stock codes when present.",
} as const;

export const searchCompanyValidationCopy = {
  inputExpected: "search_company_parameters_object",
  inputMustBeObject:
    "search-company input must be an object containing semantic parameters.",
  expectedNonEmptyString: "string with at least 2 characters",
  expectedIntegerBetween: (minimum: number, maximum: number): string =>
    `integer between ${minimum} and ${maximum}`,
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `Missing required parameter "${parameter}". Expected ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `Parameter "${parameter}" must be a string.`,
  mustBeInteger: (parameter: string): string =>
    `Parameter "${parameter}" must be an integer.`,
  mustBeInRange: (parameter: string, minimum: number, maximum: number): string =>
    `Parameter "${parameter}" must be between ${minimum} and ${maximum}.`,
  mustBeAtLeastTwoChars: (parameter: string): string =>
    `Parameter "${parameter}" must be at least 2 characters long.`,
  unknownParameter: (parameter: string): string =>
    `Unknown parameter: "${parameter}".`,
} as const;
