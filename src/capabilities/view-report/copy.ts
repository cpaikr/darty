export const viewReportToolCopy = {
  title: "DART 보고서 보기",
  description:
    "DART 접수번호 또는 viewer URL로 보고서 문서 목록과 목차를 확인하고, 선택한 본문을 HTML 또는 Markdown으로 반환합니다.",
} as const;

export const viewReportFieldCopy = {
  receipt: {
    description:
      "DART 접수번호 또는 /dsaf001/main.do?rcpNo=... viewer URL.",
    cliDescription: "DART 접수번호 또는 viewer URL",
  },
  documentId: {
    description:
      "view-report 결과의 documents[].id 값. 생략하면 기본 본문 문서를 사용합니다.",
    cliDescription: "조회할 문서 ID(documents[].id)",
  },
  sectionId: {
    description:
      "view-report 결과의 toc[].id 값. TOC가 있는 문서에서 선택한 목차 섹션을 조회할 때 사용합니다. 섹션 ID는 보고서별로 새로 부여되므로 다른 접수번호나 연도 보고서에 재사용하지 마세요.",
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
      "반환할 본문 최대 바이트 수. 기본값은 50000이며, 초과하면 잘라내고 warnings에 표시합니다. 크게 지정하면 긴 섹션의 출력과 에이전트 context 사용량이 커질 수 있습니다.",
    cliDescription:
      "[기본값: 50000] 반환할 본문 최대 바이트 수. 크게 지정하면 출력/context가 커질 수 있습니다.",
  },
} as const;

export const viewReportSchemaCopy = {
  requestDescription: "DART 보고서 보기 요청.",
  resultDescription:
    "DART 보고서 문서/목차와 선택 섹션 또는 전체 문서 본문 결과.",
} as const;

export const viewReportValidationCopy = {
  unknownParameter: (parameter: string) =>
    `알 수 없는 매개변수 "${parameter}"입니다.`,
  missingRequired: (parameter: string, expected: string) =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expected}.`,
  invalidParameter: (parameter: string, expected: string) =>
    `매개변수 "${parameter}"이(가) 올바르지 않습니다. 필요한 값: ${expected}.`,
  expectedReceipt: "DART 접수번호 또는 rcpNo를 포함한 viewer URL",
  expectedNonEmptyString: "비어 있지 않은 문자열",
  expectedOutputFormat: "html 또는 markdown",
  expectedMaxBytes: "1,000 이상 1,000,000 이하의 정수",
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
    "`--output-format markdown`은 복잡한 DART 표를 HTML table로 보존할 수 있습니다. rowspan/colspan이 있는 표는 자동 파싱 전 원문 구조를 확인하세요.",
    "PDF는 darty 내부에서 처리하지 않습니다. PDF 링크는 직접 다운로드하거나 다른 PDF 처리/읽기 도구로 열어 사용하세요.",
  ],
} as const;

export const viewReportFailureCopy = {
  unexpectedViewReport: "보고서 조회 중 예상하지 못한 오류가 발생했습니다.",
} as const;
