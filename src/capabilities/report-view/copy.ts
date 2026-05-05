export const reportViewToolCopy = {
  title: "DART 보고서 보기",
  description:
    "DART 접수번호 또는 viewer URL로 보고서 문서 목록과 목차를 확인하고, 선택한 목차 섹션의 정제된 HTML을 반환합니다.",
} as const;

export const reportViewFieldCopy = {
  receipt: {
    description:
      "DART 접수번호 또는 /dsaf001/main.do?rcpNo=... viewer URL.",
    cliDescription: "DART 접수번호 또는 viewer URL",
  },
  documentId: {
    description:
      "report-view 결과의 documents[].id 값. 생략하면 기본 본문 문서를 사용합니다.",
    cliDescription: "조회할 문서 ID(documents[].id)",
  },
  sectionId: {
    description:
      "report-view 결과의 toc[].id 값. TOC가 있는 문서에서 선택한 목차 섹션을 조회할 때 사용합니다.",
    cliDescription: "조회할 목차 섹션 ID(toc[].id)",
  },
  outputFormat: {
    description: "본문 출력 형식. 현재는 html만 지원합니다.",
    cliDescription: "본문 출력 형식(html)",
  },
  maxBytes: {
    description: "반환할 HTML 최대 바이트 수. 초과하면 잘라내고 warnings에 표시합니다.",
    cliDescription: "반환할 HTML 최대 바이트 수",
  },
} as const;

export const reportViewSchemaCopy = {
  requestDescription: "DART 보고서 보기 요청.",
  resultDescription:
    "DART 보고서 문서/목차와 선택 섹션 또는 전체 문서 HTML 결과.",
} as const;

export const reportViewValidationCopy = {
  unknownParameter: (parameter: string) =>
    `알 수 없는 매개변수 "${parameter}"입니다.`,
  missingRequired: (parameter: string, expected: string) =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expected}.`,
  invalidParameter: (parameter: string, expected: string) =>
    `매개변수 "${parameter}"이(가) 올바르지 않습니다. 필요한 값: ${expected}.`,
  expectedReceipt: "DART 접수번호 또는 rcpNo를 포함한 viewer URL",
  expectedNonEmptyString: "비어 있지 않은 문자열",
  expectedHtmlOutput: "html",
  expectedMaxBytes: "1,000 이상 1,000,000 이하의 정수",
} as const;

export const reportViewCliCopy = {
  summary: "DART 보고서 목차 또는 섹션 HTML을 조회합니다.",
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
      argv: ["--receipt", "20260331004166", "--section-id", "section:3.6"],
    },
  ],
} as const;

export const reportViewFailureCopy = {
  unexpectedReportView: "보고서 조회 중 예상하지 못한 오류가 발생했습니다.",
} as const;
