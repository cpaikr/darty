export const contentsSearchFieldCopy = {
  page: {
    description: "요청할 검색 결과 페이지입니다(1부터 시작).",
    cliDescription: "요청할 검색 결과 페이지입니다(1부터 시작). [확인됨] 기본값: 1.",
  },
  sortBy: {
    description: "결과 정렬 기준입니다.",
    cliDescription:
      "결과 정렬 기준입니다(date=접수일자, reportName=보고서명). [확인됨] 기본값: date.",
  },
  sortDirection: {
    description: "선택한 정렬 기준의 정렬 방향입니다.",
    cliDescription: "선택한 정렬 기준의 정렬 방향입니다. [확인됨] 기본값: desc.",
  },
  keyword: {
    description: "본문내용 입력값입니다.",
    cliDescription: "본문내용 입력값입니다. [확인됨] 필수.",
  },
  startDate: {
    description: "검색시작일입니다(YYYYMMDD).",
    cliDescription: "검색시작일입니다(YYYYMMDD). [확인됨] 필수.",
  },
  endDate: {
    description: "검색종료일입니다(YYYYMMDD).",
    cliDescription: "검색종료일입니다(YYYYMMDD). [확인됨] 필수.",
  },
  companyCode: {
    description: "회사명/종목코드로 필터링합니다.",
    cliDescription: "회사명/종목코드로 필터링합니다. [확인됨]",
  },
  presenterName: {
    description: "제출인명으로 필터링합니다.",
    cliDescription: "제출인명으로 필터링합니다. [확인됨]",
  },
  reportName: {
    description: "보고서명으로 필터링합니다.",
    cliDescription: "보고서명으로 필터링합니다. [확인됨]",
  },
} as const;

export const contentsSearchCliCopy = {
  summary: "DART 공시 본문을 검색하고 구조화된 JSON을 반환합니다.",
  examplesHeading: "예시",
  notesHeading: "참고",
  examples: [
    {
      description: "키워드로 최근 본문 일치 항목을 검색합니다.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ],
    },
    {
      description: "확인된 회사 코드와 제출인 필터로 결과를 좁힙니다.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--company-code",
        "01368637",
        "--presenter-name",
        "유일에너테크",
        "--sort-by",
        "reportName",
      ],
    },
  ],
  notes: [
    "이 명령은 의미 기반 매개변수 이름만 받으며, DART 재현 필드 이름은 내부에만 둡니다.",
    "이 모드의 페이지 크기와 페이지 이동 폭은 현재 DART가 제어하므로 공개 기능 계약에 포함하지 않습니다.",
    "결과는 파서 소유 원본 행을 그대로 노출하지 않고 안정적인 공개 필드, 참조, 출처 근거로 묶습니다.",
    "경고는 일부 행 누락처럼 부분적으로 복구 가능한 출처 변경을 결과 보존과 함께 보고합니다.",
  ],
  invalidInteger: (value: string): string =>
    `정수를 입력해야 하지만 "${value}"을(를) 받았습니다.`,
} as const;

export const contentsSearchFailureCopy = {
  unexpectedContentsSearch: "본문 검색 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const contentsSearchMcpCopy = {
  instructions:
    "Darty는 의미 기반 입력과 구조화된 JSON 결과를 사용하는 읽기 전용 DART 검색 도구를 제공합니다.",
  unknownTool: (name: string): string => `알 수 없는 도구입니다: "${name}".`,
} as const;

export const contentsSearchResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `검색 결과 행 ${droppedItemCount}개를 파싱하지 못해 생략했습니다.`,
} as const;

export const contentsSearchSchemaCopy = {
  dateStringDescription: "YYYYMMDD 형식의 날짜 문자열입니다.",
  requestDescription: "`contents-search` 공개 의미 기반 입력 계약입니다.",
  resultDescription: "성공한 contents-search 결과 객체입니다.",
} as const;

export const contentsSearchToolCopy = {
  title: "DART 본문 검색",
  description:
    "내부 dsab007 재현 어댑터를 통해 DART 공시 본문 검색을 읽기 전용 의미 기반 입력으로 제공합니다.",
} as const;

export const contentsSearchValidationCopy = {
  inputExpected: "contents_search_parameters_object",
  inputMustBeObject:
    "contents-search 입력은 의미 기반 매개변수를 담은 객체여야 합니다.",
  expectedNonEmptyString: "비어 있지 않은 문자열",
  expectedDateYYYYMMDD: "YYYYMMDD 형식의 날짜 문자열",
  expectedOneOf: (choices: readonly string[]): string => choices.join(" 또는 "),
  expectedIntegerBetween: (minimum: number, maximum: number): string =>
    `${minimum} 이상 ${maximum} 이하의 정수`,
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 문자열이어야 합니다.`,
  mustBeInteger: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 정수여야 합니다.`,
  mustBeOneOf: (parameter: string, choices: readonly string[]): string =>
    `매개변수 "${parameter}"은(는) 다음 중 하나여야 합니다: ${choices.join(", ")}.`,
  mustBeInRange: (parameter: string, minimum: number, maximum: number): string =>
    `매개변수 "${parameter}"은(는) ${minimum} 이상 ${maximum} 이하여야 합니다.`,
  mustNotBeEmpty: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 비워 둘 수 없습니다.`,
  mustUseDateFormat: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) YYYYMMDD 형식이어야 합니다.`,
  invalidParameter: (parameter: string): string =>
    `매개변수 "${parameter}"이(가) 올바르지 않습니다.`,
  unknownParameter: (parameter: string): string =>
    `알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
