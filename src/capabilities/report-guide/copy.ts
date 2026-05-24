export const reportGuideCliCopy = {
  summary: "DART 보고서별 정보 안내를 출력합니다.",
  description:
    "어떤 DART 보고서에 어떤 정보가 들어 있는지 사람이 읽기 쉬운 Markdown 안내문으로 보여줍니다.",
  examplesHeading: "예시",
  examples: [
    {
      description: "DART 보고서별 정보 안내문을 출력합니다.",
      argv: [],
    },
  ],
  notesHeading: "사용 팁",
  notes: [
    "보고서 종류를 고르기 전에 어느 보고서에 필요한 정보가 있는지 확인할 때 사용하세요.",
    "이 명령은 네트워크를 사용하지 않고 패키지에 포함된 안내문을 출력합니다.",
  ],
} as const;

export const reportGuideFailureCopy = {
  unexpectedReportGuide:
    "DART 보고서별 정보 안내를 불러오는 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const reportGuideSchemaCopy = {
  requestDescription:
    "입력값이 없는 DART 보고서별 정보 안내 조회 요청입니다.",
  requestExamples: [{}],
  resultDescription:
    "어떤 DART 보고서에 어떤 정보가 들어 있는지 설명하는 Markdown 안내문입니다.",
} as const;

export const reportGuideToolCopy = {
  title: "DART 보고서별 정보 안내",
  description:
    "필요한 정보가 사업보고서, 주요사항보고서, 발행공시, 합병 공시, 지분공시 중 어디에 있는지 안내하는 정적 가이드입니다.",
} as const;

export const reportGuideValidationCopy = {
  inputExpected: "empty_report_guide_parameters_object",
  inputMustBeObject:
    "report-guide 입력은 빈 객체여야 합니다. 이 명령은 매개변수를 받지 않습니다.",
  unknownParameter: (parameter: string): string =>
    `report-guide는 매개변수를 받지 않습니다. 알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
