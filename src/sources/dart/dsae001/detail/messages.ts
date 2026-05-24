export const dsae001DetailMessages = {
  sourceUnavailable: "Could not fetch DART 기업개황 company details.",
  htmlDecodeFailure: "Could not read DART 기업개황 detail HTML.",
  missingDetailTable: "Could not find the detail table in DART 기업개황 detail results.",
  missingCompanyName: "Could not find the company name in DART 기업개황 detail results.",
  companyNotFound: (companyCode: string): string =>
    `Could not find a company for DART company code ${companyCode} in DART 기업개황 details.`,
  sourceSchemaMismatch: "DART 기업개황 detail results did not match the expected schema.",
  internalProvider: "Unexpected internal error while processing DART 기업개황 details.",
} as const;
