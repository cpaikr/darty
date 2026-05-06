const dartSearchSyntaxSummary =
  'DART 공통 검색 문법: `사과 포도`=AND, `사과|포도`=OR, `사과!포도`=NOT, `"사과 포도"`=정확한 구문.';

const dartSearchSyntaxDetails =
  'DART 공통 검색 문법: `사과 포도`는 사과와 포도가 모두 존재하는 문서, `사과|포도`는 둘 중 하나가 존재하는 문서, `사과!포도`는 사과 검색 결과 중 포도가 있는 문서를 제외, `"사과 포도"`는 사과/포도 순서가 정확한 `사과포도` 또는 `사과 포도` 단어를 검색하며 중간에 다른 단어나 구절이 포함될 수 없습니다.';

export const searchBodyFieldCopy = {
  page: {
    description: "[기본값: 1] DART 검색 결과 페이지입니다(1부터 시작).",
    cliDescription: "[기본값: 1] DART 검색 결과 페이지입니다(1부터 시작)."
  },
  sortBy: {
    description:
      "[기본값: date] DART 본문내용 검색 결과 정렬 기준입니다(date=접수일자, reportName=보고서명).",
    cliDescription:
      "[기본값: date] DART 본문내용 검색 결과 정렬 기준입니다(date=접수일자, reportName=보고서명)."
  },
  sortDirection: {
    description: "[기본값: desc] 선택한 정렬 기준의 정렬 방향입니다.",
    cliDescription: "[기본값: desc] 선택한 정렬 기준의 정렬 방향입니다."
  },
  keyword: {
    description:
      `[필수] DART 공시통합검색의 본문내용 검색어입니다. ${dartSearchSyntaxDetails}`,
    cliDescription:
      `[필수] DART 공시통합검색의 본문내용 검색어입니다. ${dartSearchSyntaxSummary}`,
  },
  startDate: {
    description: "[필수] DART 검색기간 시작일입니다(YYYYMMDD).",
    cliDescription: "[필수] DART 검색기간 시작일입니다(YYYYMMDD).",
  },
  endDate: {
    description: "[필수] DART 검색기간 종료일입니다(YYYYMMDD).",
    cliDescription: "[필수] DART 검색기간 종료일입니다(YYYYMMDD).",
  },
  companyCode: {
    description:
      "DART 회사 코드(8자리 숫자). 회사명이나 종목코드 자유 입력은 지원하지 않습니다.",
    cliDescription:
      "DART 회사 코드(8자리 숫자). 자유 입력 회사명은 지원하지 않습니다.",
  },
  presenterName: {
    description:
      "제출인명. 제출인이 공시대상회사와 다를 수 있는 지분공시/감사보고서 검색에 유용합니다.",
    cliDescription:
      "제출인명. 제출인이 공시대상회사와 다를 수 있는 지분공시/감사보고서 검색에 유용합니다.",
  },
  reportName: {
    description:
      "보고서명. DART 보고서명 목록의 값이어야 하며 자유 입력 문구가 아닙니다(예: 주주총회소집공고).",
    cliDescription:
      "보고서명. DART 보고서명 목록의 값이어야 하며 자유 입력 문구가 아닙니다(예: 주주총회소집공고).",
  },
} as const;

export const searchBodyCliCopy = {
  summary: "DART 공시통합검색의 본문내용 검색 결과를 구조화된 JSON으로 반환합니다.",
  examplesHeading: "예시",
  examples: [
    {
      description: "키워드로 DART 본문내용 일치 항목을 검색합니다.",
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
      description: "확인된 회사 코드와 제출인명으로 검색합니다.",
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
  notesHeading: "검색 팁",
  notes: [
    "본문내용 검색은 문서 단위 키워드 검색입니다. 공백으로 여러 단어를 넣으면 같은 문서 안에 모두 존재하는지를 찾으며, 같은 문단/표/항목에 함께 있다는 뜻은 아닙니다.",
    "핵심감사사항(KAM)처럼 문맥 확인이 필요한 검색은 search-body로 후보를 좁힌 뒤 결과의 viewerUrl 또는 접수번호를 view-report에 넘겨 실제 보고서 본문을 확인하세요.",
  ],
  invalidInteger: (value: string): string =>
    `정수를 입력해야 하지만 "${value}"을(를) 받았습니다.`,
} as const;

export const searchBodyFailureCopy = {
  unexpectedSearchBody: "본문 검색 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const searchBodyResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `검색 결과 행 ${droppedItemCount}개를 파싱하지 못해 생략했습니다.`,
} as const;

export const searchBodySchemaCopy = {
  dateStringDescription: "YYYYMMDD 형식의 날짜 문자열입니다.",
  requestDescription:
    "DART 공시통합검색 `본문내용` 모드의 의미 기반 검색 입력입니다. 필수: keyword, startDate, endDate.",
  resultDescription: "성공한 search-body 결과 객체입니다. 검색 결과, 메타데이터, 참조 URL, 경고를 포함합니다.",
} as const;

export const searchBodyToolCopy = {
  title: "DART 본문내용 검색",
  description:
    `DART 공시통합검색의 \`본문내용\` 모드로 제출 공시문서의 내용 검색 결과를 구조화된 JSON으로 반환합니다. ${dartSearchSyntaxSummary}`,
} as const;

export const searchBodyValidationCopy = {
  inputExpected: "search_body_parameters_object",
  inputMustBeObject:
    "search-body 입력은 의미 기반 매개변수를 담은 객체여야 합니다.",
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
  mustBeRealDate: (parameter: string, actual: string): string =>
    `매개변수 "${parameter}"은(는) YYYYMMDD 형식의 실제 날짜여야 합니다. "${actual}"은(는) 유효한 날짜가 아닙니다.`,
  startDateMustNotBeAfterEndDate: (startDate: string, endDate: string): string =>
    `검색 시작일은 종료일보다 늦을 수 없습니다. startDate=${startDate}, endDate=${endDate}.`,
  mustUseDartCompanyCode: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 8자리 DART 회사 코드여야 합니다. 회사명이나 6자리 종목코드는 사용할 수 없습니다. 예: 삼성전자 DART 회사 코드 00126380.`,
  invalidParameter: (parameter: string): string =>
    `매개변수 "${parameter}"이(가) 올바르지 않습니다.`,
  unknownParameter: (parameter: string): string =>
    `알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
