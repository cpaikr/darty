export const dsab007ContentsMessages = {
  sourceUnavailable: "Could not connect to DART search.",
  htmlDecodeFailure: "Could not decode DART search HTML.",
  missingResultTable: "Could not find the result table in the DART search response.",
  missingResultRows: "Could not find result rows in the DART search response.",
  missingTotalCount: "Could not find totalCnt in the DART search response.",
  missingViewerLink: "Could not find the disclosure viewer link in the search result row.",
  missingReceiptNumber: "Could not find rcpNo in the disclosure viewer link.",
  companyMismatch: "A DART search result row belonged to a different company and was dropped.",
  rowParseFailed: "Could not parse the search result row.",
  sourceSchemaMismatch: "DART response did not match the expected source schema.",
  internalProvider: "Unexpected internal error while processing the provider response.",
} as const;
