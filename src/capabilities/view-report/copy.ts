import {
  formatViewReportByteRange,
  formatViewReportExpectedMaxBytes,
  viewReportContentWindowLimits,
} from "./constants.ts";

const defaultMaxBytes = viewReportContentWindowLimits.defaultMaxBytes;
const defaultStartByte = viewReportContentWindowLimits.defaultStartByte;
const maxBytesRange = formatViewReportByteRange();

export const viewReportToolCopy = {
  title: "DART 보고서 보기",
  description:
    "DART 접수번호 또는 viewer URL로 보고서 문서 목록과 목차를 확인하고, 선택한 본문을 HTML 또는 Markdown으로 반환합니다.",
} as const;

export const viewReportFieldCopy = {
  receipt: {
    description:
      "14자리 DART 접수번호 또는 rcpNo가 포함된 /dsaf001/main.do viewer URL. URL의 dcmNo는 내부 문서 선택에만 사용되며 별도 입력으로 받지 않습니다.",
    cliDescription: "DART 접수번호 또는 viewer URL",
  },
  documentId: {
    description:
      "이전 view-report 응답의 documents[].id 값. DART dcmNo가 아니며, 생략하면 선택된 기본 본문 문서를 사용합니다.",
    cliDescription: "조회할 문서 ID(documents[].id)",
  },
  sectionId: {
    description:
      "같은 receipt/documentId의 이전 view-report 응답에서 받은 toc[].id 값. DART eleId/offset이 아니며, 연도·정정·다른 접수번호에 재사용하지 마세요.",
    cliDescription:
      "조회할 목차 섹션 ID(toc[].id). 보고서별 값이므로 다른 보고서에 재사용하지 마세요.",
  },
  outputFormat: {
    description:
      "JSON 결과의 본문 형식. html 또는 best-effort markdown을 지원하며 기본값은 markdown입니다.",
    cliDescription: "[기본값: markdown] JSON 결과의 본문 형식(html 또는 markdown)",
  },
  maxBytes: {
    description:
      `반환할 본문 최대 바이트 수. 기본값은 ${defaultMaxBytes}이며, 범위는 ${maxBytesRange}입니다. 초과하면 잘라내고 warnings에 표시합니다. 크게 지정하면 긴 섹션의 출력과 에이전트 context 사용량이 커질 수 있습니다.`,
    cliDescription:
      `[기본값: ${defaultMaxBytes}, 범위: ${maxBytesRange}] 반환할 본문 최대 바이트 수. 크게 지정하면 출력/context가 커질 수 있습니다.`,
  },
  contentStartByte: {
    description:
      `렌더링된 content.body 형식 기준 UTF-8 시작 바이트 위치. 기본값은 ${defaultStartByte}입니다. DART viewer offset이 아니며, 다음 창은 같은 receipt/documentId/sectionId/outputFormat 요청에 content.window.nextStartByte 값을 사용하세요.`,
    cliDescription:
      `[기본값: ${defaultStartByte}] 렌더링된 본문 기준 UTF-8 시작 바이트. 같은 outputFormat으로 이어서 읽으세요.`,
  },
} as const;

export const viewReportSchemaCopy = {
  requestDescription:
    "DART 보고서 보기 요청. 먼저 receipt로 문서/목차를 조회한 뒤, 반환된 documentId/sectionId만 후속 호출에 사용하세요.",
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
    "DART 보고서 문서/목차와 선택 섹션 또는 전체 문서 본문 결과.",
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
      ? `raw DART viewer 매개변수 "${parameter}"은(는) 직접 입력할 수 없습니다. receipt로 목차를 조회한 뒤 반환된 documentId/sectionId를 사용하고, 이어 읽기는 content.window.nextStartByte를 contentStartByte로 넘기세요.`
      : `알 수 없는 매개변수 "${parameter}"입니다.`,
  missingRequired: (parameter: string, expected: string) =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expected}.`,
  invalidParameter: (parameter: string, expected: string) =>
    `매개변수 "${parameter}"이(가) 올바르지 않습니다. 필요한 값: ${expected}.`,
  expectedReceipt:
    "14자리 DART 접수번호 또는 rcpNo를 포함한 /dsaf001/main.do viewer URL",
  expectedDocumentId: "이전 view-report 응답의 documents[].id",
  expectedSectionId: "같은 receipt/documentId의 이전 view-report 응답의 toc[].id",
  expectedOutputFormat: "html 또는 markdown",
  expectedMaxBytes: formatViewReportExpectedMaxBytes(),
  expectedContentStartByte:
    "0 이상의 정수. DART offset이 아니라 content.window.nextStartByte로 이어 읽는 렌더링 본문 바이트 위치",
  expectedDetail: "concise, detailed, raw 중 하나",
} as const;

export const viewReportCliCopy = {
  summary: "DART 보고서 목차 또는 본문을 조회합니다.",
  invalidInteger: (actual: string) =>
    `정수를 입력해야 하지만 "${actual}"을(를) 받았습니다.`,
  examplesHeading: "예시",
  examples: [
    {
      description: "접수번호로 문서 목록과 목차 보기",
      argv: ["--receipt", "20260331004166"],
    },
    {
      description: "search-body 결과의 viewerUrl로 목차 보기",
      argv: [
        "--receipt",
        "'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260430001931&dcmNo=11360863'",
      ],
    },
    {
      description: "긴 섹션을 작은 창으로 읽기",
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
      description: "이전 결과의 content.window.nextStartByte로 이어서 읽기",
      command:
        "--receipt 20260430001931 --section-id section:3.5 --max-bytes 2000 --content-start-byte <content.window.nextStartByte>",
    },
    {
      description: "목차 섹션 HTML 보기",
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
  notesHeading: "주의사항",
  notes: [
    "toc[].id/section ID는 한 보고서 안에서만 쓰는 값입니다. 연도, 정정, 다른 접수번호의 보고서에 재사용하지 말고 매 보고서에서 목차를 먼저 조회하세요.",
    "`--section-id`로 본문을 조회하거나 TOC 없는 문서를 조회하면 content.body가 반환됩니다. 긴 섹션은 출력과 에이전트 context가 커질 수 있으니 필요한 섹션만 조회하고 `--max-bytes`는 필요한 만큼만 키우세요.",
    "content.window.hasMore가 true이면 같은 `--receipt`, `--document-id`, `--section-id`, `--output-format` 요청에 `--content-start-byte`를 content.window.nextStartByte 값으로 넘겨 이어서 읽으세요. 이 값은 렌더링된 본문 기준이며 DART viewer offset이 아닙니다.",
    "`--output-format markdown`은 복잡한 DART 표를 HTML table로 보존할 수 있습니다. rowspan/colspan이 있는 표는 자동 파싱 전 원문 구조를 확인하세요.",
    "긴 감사보고서/사업보고서는 search-body 결과의 viewerUrl 또는 receiptNumber를 view-report에 넘긴 뒤, 목차에서 필요한 섹션만 창 단위로 조회하세요.",
    "content.isFullContent는 반환된 body가 전체 렌더링 본문인지 나타냅니다. 이어서 읽을 내용이 있는지는 content.window.hasMore를 확인하세요.",
    "`--detail`은 content.body를 바꾸지 않고 함께 반환할 locator 필드만 조정합니다. section 본문에서 documents/toc도 필요하면 `--detail detailed` 또는 `--detail raw`를 사용하세요.",
    "PDF는 darty 내부에서 처리하지 않습니다. PDF 링크는 직접 다운로드하거나 다른 PDF 처리/읽기 도구로 열어 사용하세요.",
  ],
} as const;

export const viewReportFailureCopy = {
  unexpectedViewReport: "보고서 조회 중 예상하지 못한 오류가 발생했습니다.",
} as const;
