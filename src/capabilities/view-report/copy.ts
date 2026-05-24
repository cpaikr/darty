import {
  formatViewReportByteRange,
  formatViewReportExpectedMaxBytes,
  viewReportContentWindowLimits,
} from "./constants.ts";

const defaultMaxBytes = viewReportContentWindowLimits.defaultMaxBytes;
const defaultStartByte = viewReportContentWindowLimits.defaultStartByte;
const maxBytesRange = formatViewReportByteRange();

export const viewReportToolCopy = {
  title: "DART report viewer",
  description:
    "Fetch a DART report document list and table of contents by receipt number or viewer URL, then return the selected body as HTML or Markdown.",
} as const;

export const viewReportFieldCopy = {
  receipt: {
    description:
      "14-digit DART receipt number or /dsaf001/main.do viewer URL containing rcpNo. URL dcmNo is used only for internal document selection and is not accepted as a separate input.",
    cliDescription: "DART receipt number or viewer URL",
  },
  documentId: {
    description:
      "documents[].id from a previous view-report response. This is not DART dcmNo; omit it to use the selected default body document.",
    cliDescription: "Document ID to fetch (documents[].id)",
  },
  sectionId: {
    description:
      "toc[].id from a previous view-report response for the same receipt/documentId. This is not DART eleId/offset; do not reuse it across years, corrections, or other receipt numbers.",
    cliDescription:
      "TOC section ID to fetch (toc[].id). It is report-specific; do not reuse it across reports.",
  },
  outputFormat: {
    description:
      "Body format in the JSON result. Supports html or best-effort markdown; default is markdown.",
    cliDescription: "[default: markdown] Body format in the JSON result (html or markdown)",
  },
  maxBytes: {
    description:
      `Maximum body bytes to return. Default is ${defaultMaxBytes}; range is ${maxBytesRange}. Longer content is truncated and reported in warnings. Larger values can increase output size and agent context use for long sections.`,
    cliDescription:
      `[default: ${defaultMaxBytes}, range: ${maxBytesRange}] Maximum body bytes to return. Larger values can increase output/context size.`,
  },
  contentStartByte: {
    description:
      `UTF-8 start byte in the rendered content.body format. Default is ${defaultStartByte}. This is not a DART viewer offset. To continue reading, pass content.window.nextStartByte from the previous response for the same receipt/documentId/sectionId/outputFormat.`,
    cliDescription:
      `[default: ${defaultStartByte}] UTF-8 start byte in the rendered body. Continue with the same outputFormat.`,
  },
} as const;

export const viewReportSchemaCopy = {
  requestDescription:
    "DART report viewer request. First fetch documents/TOC by receipt, then use only returned documentId/sectionId values in follow-up calls.",
  requestExamples: [
    {
      receipt: "20260331004166",
      outputFormat: "markdown",
      detail: "concise",
      maxBytes: defaultMaxBytes,
      contentStartByte: defaultStartByte,
    },
    {
      receipt: "20260331004166",
      sectionId: "section:3.5",
      outputFormat: "markdown",
      detail: "concise",
      maxBytes: 2000,
      contentStartByte: defaultStartByte,
    },
  ],
  resultDescription:
    "DART report document/TOC result with the selected section or whole-document body when requested.",
} as const;

const rawDartViewerParameters = new Set([
  "dcmNo",
  "eleId",
  "offset",
  "length",
  "dtd",
  "tocNo",
  "atocId",
]);

export const viewReportValidationCopy = {
  unknownParameter: (parameter: string) =>
    rawDartViewerParameters.has(parameter)
      ? `Raw DART viewer parameter "${parameter}" cannot be passed directly. Fetch the TOC with receipt, then use the returned documentId/sectionId; continue reading with content.window.nextStartByte as contentStartByte.`
      : `Unknown parameter "${parameter}".`,
  missingRequired: (parameter: string, expected: string) =>
    `Missing required parameter "${parameter}". Expected ${expected}.`,
  invalidParameter: (parameter: string, expected: string) =>
    `Parameter "${parameter}" is invalid. Expected ${expected}.`,
  inputExpected: "view_report_parameters_object",
  inputMustBeObject: "view-report input must be an object containing parameters.",
  expectedReceipt:
    "14-digit DART receipt number or /dsaf001/main.do viewer URL containing rcpNo",
  expectedDocumentId: "documents[].id from a previous view-report response",
  expectedSectionId: "toc[].id from a previous view-report response for the same receipt/documentId",
  expectedOutputFormat: "html or markdown",
  expectedMaxBytes: formatViewReportExpectedMaxBytes(),
  expectedContentStartByte:
    "integer greater than or equal to 0; rendered-body byte position for continuation via content.window.nextStartByte, not a DART offset",
  expectedDetail: "one of concise, detailed, raw",
} as const;

export const viewReportCliCopy = {
  summary: "Fetch a DART report table of contents or body content.",
  invalidInteger: (actual: string) =>
    `Expected an integer but received "${actual}".`,
  examplesHeading: "Examples",
  examples: [
    {
      description: "View documents and TOC by receipt number",
      argv: ["--receipt", "20260331004166"],
    },
    {
      description: "View TOC from a search-body viewerUrl",
      argv: [
        "--receipt",
        "'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260430001931&dcmNo=11360863'",
      ],
    },
    {
      description: "Read a long section in a small window",
      argv: [
        "--receipt",
        "20260430001931",
        "--section-id",
        "section:3.5",
        "--max-bytes",
        "2000",
      ],
    },
    {
      description: "Continue reading from content.window.nextStartByte in a previous result",
      command:
        "--receipt 20260430001931 --section-id section:3.5 --max-bytes 2000 --content-start-byte <content.window.nextStartByte>",
    },
    {
      description: "View TOC section HTML",
      argv: [
        "--receipt",
        "20260331004166",
        "--section-id",
        "section:3.6",
        "--output-format",
        "html",
      ],
    },
  ],
  notesHeading: "Cautions",
  notes: [
    "toc[].id/section ID values are valid only inside one report. Do not reuse them across years, corrections, or other receipt numbers; fetch the TOC for each report first.",
    "When `--section-id` fetches body content, or when a document has no TOC, content.body is returned. Long sections can consume substantial output and agent context, so request only needed sections and increase `--max-bytes` only as needed.",
    "If content.window.hasMore is true, continue with the same `--receipt`, `--document-id`, `--section-id`, and `--output-format`, passing content.window.nextStartByte as `--content-start-byte`. This value is based on the rendered body, not DART viewer offsets.",
    "`--output-format markdown` may preserve complex DART tables as HTML table fragments. Check original structure before parsing tables with rowspan/colspan automatically.",
    "For long 감사보고서/사업보고서 files, pass a search-body viewerUrl or receiptNumber to view-report, then fetch only the needed TOC section in windows.",
    "content.isFullContent indicates whether the returned body is the full rendered body. Use content.window.hasMore to determine whether more content remains.",
    "`--detail` changes only supplemental locator fields, not content.body. Use `--detail detailed` or `--detail raw` when you also need documents/toc with section body output.",
    "Darty does not process PDFs internally. Download PDF links directly or open them with a separate PDF processing/reading tool.",
  ],
} as const;

export const viewReportFailureCopy = {
  unexpectedViewReport: "Unexpected error while fetching the report.",
} as const;
