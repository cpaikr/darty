export const companyRssFieldCopy = {
  companyCode: {
    description: "[required] 8-digit DART company code. Example: Samsung Electronics 00126380.",
    cliDescription: "[required] 8-digit DART company code. Example: Samsung Electronics 00126380.",
  },
} as const;

export const companyRssCliCopy = {
  summary: "Fetch the DART company disclosure RSS feed.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Fetch company disclosure RSS by DART company code.",
      argv: ["--company-code", "00126380"],
    },
  ],
} as const;

export const companyRssFailureCopy = {
  unexpectedCompanyRss: "Unexpected internal error while fetching company RSS.",
} as const;

export const companyRssSchemaCopy = {
  requestDescription: "DART company disclosure RSS lookup input. Required: companyCode.",
  requestExamples: [{ companyCode: "00126380", detail: "concise" }],
  resultDescription: "Successful company-rss result envelope with RSS channel, disclosure items, metadata, and source references.",
} as const;

export const companyRssToolCopy = {
  title: "DART company RSS lookup",
  description:
    "Fetch recent disclosure items from DART companyRSS for an 8-digit DART company code.",
} as const;

export const companyRssValidationCopy = {
  inputExpected: "company_rss_parameters_object",
  inputMustBeObject: "company-rss input must be an object containing semantic parameters.",
  expectedCompanyCode: "8-digit DART company code",
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `Missing required parameter "${parameter}". Expected ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `Parameter "${parameter}" must be a string.`,
  invalidCompanyCode: (parameter: string): string =>
    `Parameter "${parameter}" must be an 8-digit DART company code.`,
  expectedDetail: "one of concise, detailed, raw",
  invalidDetail: (parameter: string): string =>
    `Parameter "${parameter}" must be one of concise, detailed, raw.`,
  unknownParameter: (parameter: string): string =>
    `Unknown parameter: "${parameter}".`,
} as const;
