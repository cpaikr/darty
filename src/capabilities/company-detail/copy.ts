export const companyDetailFieldCopy = {
  companyCode: {
    description: "[required] 8-digit DART company code. Example: Samsung Electronics 00126380.",
    cliDescription: "[required] 8-digit DART company code. Example: Samsung Electronics 00126380.",
  },
} as const;

export const companyDetailCliCopy = {
  summary: "Fetch DART 기업개황 company details.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Fetch company details by DART company code.",
      argv: ["--company-code", "00126380"],
    },
  ],
} as const;

export const companyDetailFailureCopy = {
  unexpectedCompanyDetail: "Unexpected internal error while fetching company details.",
} as const;

export const companyDetailSchemaCopy = {
  requestDescription: "DART 기업개황 detail lookup input. Required: companyCode.",
  requestExamples: [{ companyCode: "00126380" }],
  resultDescription: "Successful company-detail result envelope with company detail fields, metadata, and source references.",
} as const;

export const companyDetailToolCopy = {
  title: "DART company detail lookup",
  description:
    "Fetch company details from the DART 기업개황 detail page for an 8-digit DART company code.",
} as const;

export const companyDetailValidationCopy = {
  inputExpected: "company_detail_parameters_object",
  inputMustBeObject: "company-detail input must be an object containing semantic parameters.",
  expectedCompanyCode: "8-digit DART company code",
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `Missing required parameter "${parameter}". Expected ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `Parameter "${parameter}" must be a string.`,
  invalidCompanyCode: (parameter: string): string =>
    `Parameter "${parameter}" must be an 8-digit DART company code.`,
  unknownParameter: (parameter: string): string =>
    `Unknown parameter: "${parameter}".`,
} as const;
