export const dsaf001ReportMessages = {
  sourceUnavailable: "Could not access the DART report viewer.",
  htmlDecodeFailure: "Could not parse DART report HTML.",
  shellChanged: "DART report viewer structure did not match expectations.",
  documentNotFound: (documentId: string) =>
    `Document ID "${documentId}" was not found for this receipt. Call view-report again with receipt and use the returned documents[].id. Do not pass DART dcmNo as documentId.`,
  sectionNotFound: (sectionId: string) =>
    `Section ID "${sectionId}" was not found in this document TOC. Call view-report again with the same receipt/documentId and use the returned toc[].id. Section IDs cannot be reused across years, corrections, or other receipt numbers.`,
  internalProvider: "Unexpected error in the DART report provider.",
} as const;
