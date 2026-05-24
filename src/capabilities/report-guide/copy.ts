export const reportGuideCliCopy = {
  summary: "Print a guide to information by DART report family.",
  description:
    "Show a human-readable Markdown guide to which information usually appears in which DART report family.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Print the DART report information guide.",
      argv: [],
    },
  ],
  notesHeading: "Usage tips",
  notes: [
    "Use this before choosing a report type when you need to know where DART usually places the information.",
    "This command is network-free and prints a guide bundled with the package.",
  ],
} as const;

export const reportGuideFailureCopy = {
  unexpectedReportGuide:
    "Unexpected internal error while loading the DART report information guide.",
} as const;

export const reportGuideSchemaCopy = {
  requestDescription:
    "DART report information guide request. This operation takes no input fields.",
  requestExamples: [{}],
  resultDescription:
    "Markdown guide explaining which information usually appears in which DART report family.",
} as const;

export const reportGuideToolCopy = {
  title: "DART report information guide",
  description:
    "Static guide for deciding whether needed information is usually in 사업보고서, 주요사항보고서, 발행공시, merger filings, or ownership filings.",
} as const;

export const reportGuideValidationCopy = {
  inputExpected: "empty_report_guide_parameters_object",
  inputMustBeObject:
    "report-guide input must be an empty object. This command does not accept parameters.",
  unknownParameter: (parameter: string): string =>
    `report-guide does not accept parameters. Unknown parameter: "${parameter}".`,
} as const;
