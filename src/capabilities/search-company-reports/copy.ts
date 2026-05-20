export const searchCompanyReportsFieldCopy = {
  companyCode: {
    description:
      "[필수] DART 회사 코드(8자리 숫자)입니다. 회사명이나 6자리 종목코드는 사용할 수 없습니다.",
    cliDescription:
      "[필수] DART 회사 코드(8자리 숫자)입니다. 회사명이나 종목코드는 search-company로 먼저 확인하세요.",
  },
  startDate: {
    description: "[필수] DART 검색기간 시작일입니다(YYYYMMDD).",
    cliDescription: "[필수] DART 검색기간 시작일입니다(YYYYMMDD).",
  },
  endDate: {
    description: "[필수] DART 검색기간 종료일입니다(YYYYMMDD).",
    cliDescription: "[필수] DART 검색기간 종료일입니다(YYYYMMDD).",
  },
  page: {
    description: "[기본값: 1] DART 검색 결과 페이지입니다(1부터 시작).",
    cliDescription: "[기본값: 1] DART 검색 결과 페이지입니다(1부터 시작).",
  },
  pageSize: {
    description:
      "[기본값: 15] 한 페이지에 요청할 공시 수입니다. DART 회사명 검색에서 관찰된 값은 15, 30, 50, 100입니다.",
    cliDescription:
      "[기본값: 15] 한 페이지에 요청할 공시 수입니다(15, 30, 50, 100).",
  },
  sortDirection: {
    description:
      "[기본값: desc] 접수일자 정렬 방향입니다. 정렬 기준은 내부적으로 접수일자로 고정됩니다.",
    cliDescription:
      "[기본값: desc] 접수일자 정렬 방향입니다(asc 또는 desc).",
  },
  presenterName: {
    description: "제출인명 필터입니다. DART의 `제출인명` 입력에 대응합니다.",
    cliDescription: "제출인명으로 검색 결과를 좁힙니다.",
  },
  reportName: {
    description:
      "보고서명 필터입니다. DART의 `보고서명` 입력에 대응합니다. 공시유형 코드가 아니라 보고서 제목 텍스트를 넣습니다(예: 사업보고서).",
    cliDescription:
      "보고서명으로 검색 결과를 좁힙니다(예: 사업보고서). 공시유형 코드는 --disclosure-type을 사용하세요.",
  },
  disclosureTypes: {
    description:
      "DART 공시유형 상세 코드 목록입니다. 관찰된 예: A001(사업보고서), I001(수시공시). `사업보고서` 같은 보고서명 텍스트는 reportName에 넣고, 이 필드에는 DART 코드만 넣습니다.",
    cliDescription:
      "공시유형 상세 코드를 추가합니다. 여러 번 지정할 수 있습니다. 예: A001(사업보고서), I001(수시공시).",
  },
  industryCode: {
    description:
      "[기본값: all] DART 업종 코드입니다. `all`이면 업종 필터를 적용하지 않습니다. 관찰된 예: 612(전기 통신업). DART 업종 tree root 값은 ROOTdddd 형식입니다.",
    cliDescription:
      "DART 업종 코드로 검색 결과를 좁힙니다. 기본값은 all입니다. 예: 612(전기 통신업).",
  },
  corporationType: {
    description:
      "[기본값: all] 법인유형 필터입니다. all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), E(기타법인) 중 하나입니다.",
    cliDescription:
      "법인유형으로 검색 결과를 좁힙니다(all=전체, P=유가증권시장, A=코스닥시장, N=코넥스시장, E=기타법인).",
  },
  closingAccountsMonth: {
    description:
      "[기본값: all] 결산월 필터입니다. all 또는 01부터 12까지의 두 자리 월 코드입니다. 예: 1월은 01, 12월은 12입니다.",
    cliDescription:
      "결산월로 검색 결과를 좁힙니다(all, 1~12 또는 01~12). 1~9는 01~09로 처리됩니다.",
  },
  includeAllReports: {
    description:
      "[기본값: false] true이면 DART의 최종보고서 필터를 해제하고 정정 전 보고서까지 포함해 검색합니다.",
    cliDescription:
      "정정 전 보고서까지 포함합니다. 기본 동작은 DART의 최종보고서 필터를 적용하는 것입니다.",
  },
} as const;

export const searchCompanyReportsCliCopy = {
  summary: "DART 회사 코드로 회사별 공시 목록을 검색합니다.",
  examplesHeading: "예시",
  examples: [
    {
      description: "확인된 DART 회사 코드로 최근 회사별 공시를 검색합니다.",
      argv: [
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
      ],
    },
    {
      description: "정정 전 보고서까지 포함하고 한 페이지에 30건을 요청합니다.",
      argv: [
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
        "--page-size",
        "30",
        "--include-all-reports",
      ],
    },
    {
      description: "공시유형과 보고서명으로 회사별 공시를 좁혀 검색합니다.",
      argv: [
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
        "--disclosure-type",
        "A001",
        "--report-name",
        "사업보고서",
      ],
    },
  ],
  notesHeading: "검색 팁",
  notes: [
    "회사명을 알고 회사 코드를 모르면 먼저 `darty search-company --company-name <회사명>`으로 8자리 companyCode를 확인하세요.",
    "기본값은 DART의 최종보고서 필터를 적용합니다. `--include-all-reports`를 지정하면 정정 전 보고서까지 포함할 수 있어 총 건수가 늘어날 수 있습니다.",
    "공시유형은 DART 상세 코드(A001, I001 등)를 사용합니다. 코드를 모르면 `darty disclosure-types --query <검색어>`로 조회하고, 여러 코드는 `--disclosure-type`을 반복해서 전달하세요.",
    "결산월은 DART 월 코드(01~12)로 전달됩니다. CLI에서는 `--closing-accounts-month 1`처럼 입력해도 `01`로 정규화됩니다.",
    "결과의 filing.receiptNumber 또는 references.viewerUrl은 `view-report`로 이어서 조회할 수 있습니다.",
    "DART 행 원문 같은 원문 검증 정보(evidence)가 필요하면 `--detail detailed` 또는 `--detail raw`와 함께 `--verbose`를 사용하세요. raw도 DART 검색 HTML 전체를 출력하지 않고 행 단위 검증 필드만 추가합니다.",
  ],
  invalidInteger: (value: string): string =>
    `정수를 입력해야 하지만 "${value}"을(를) 받았습니다.`,
} as const;

export const searchCompanyReportsFailureCopy = {
  unexpectedSearchCompanyReports:
    "회사별 공시 검색 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const searchCompanyReportsResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `검색 결과 행 ${droppedItemCount}개를 파싱하지 못해 생략했습니다.`,
  matchedDisclosureTypeAmbiguous:
    "여러 공시유형 코드로 검색해 DART 결과 행의 matchedDisclosureType이 모호합니다. 행별 공시유형 귀속이 필요하면 disclosureTypes를 하나만 지정해 다시 검색하세요.",
  noResults:
    "DART 회사별 공시 검색 결과가 없습니다. 날짜 범위를 넓히거나 reportName/presenterName/disclosureTypes/industryCode/corporationType/closingAccountsMonth 필터를 줄여 다시 검색하세요.",
} as const;

export const searchCompanyReportsSchemaCopy = {
  dateStringDescription: "YYYYMMDD 형식의 날짜 문자열입니다.",
  requestDescription:
    "DART 공시통합검색 `회사명` 모드를 8자리 DART 회사 코드로 실행하는 의미 기반 검색 입력입니다. 필수: companyCode, startDate, endDate.",
  requestExamples: [
    {
      companyCode: "00126380",
      startDate: "20250331",
      endDate: "20260331",
      page: 1,
      pageSize: 15,
      sortDirection: "desc",
      detail: "concise",
      reportName: "사업보고서",
      disclosureTypes: [],
      industryCode: "all",
      corporationType: "all",
      closingAccountsMonth: "all",
      includeAllReports: false,
    },
  ],
  resultDescription:
    "성공한 search-company-reports 결과 객체입니다. 회사별 공시 결과, 메타데이터, 참조 URL, 경고를 포함합니다.",
} as const;

export const searchCompanyReportsToolCopy = {
  title: "DART 회사별 공시 검색",
  description:
    "8자리 DART 회사 코드로 DART 회사별 공시 목록을 반환합니다. 회사명 해석은 하지 않으므로 필요한 경우 search-company로 companyCode를 먼저 확인하세요.",
} as const;

export const searchCompanyReportsValidationCopy = {
  inputExpected: "search_company_reports_parameters_object",
  inputMustBeObject:
    "search-company-reports 입력은 의미 기반 매개변수를 담은 객체여야 합니다.",
  expectedDateYYYYMMDD: "YYYYMMDD 형식의 날짜 문자열",
  expectedIntegerBetween: (minimum: number, maximum: number): string =>
    `${minimum} 이상 ${maximum} 이하의 정수`,
  expectedOneOf: (choices: readonly string[]): string => choices.join(" 또는 "),
  expectedBoolean: "boolean",
  expectedNonEmptyString: "비어 있지 않은 문자열",
  expectedStringArray: "문자열 배열",
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expectedDescription}${
      expectedDescription.endsWith(".") ? "" : "."
    }`,
  mustBeString: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 문자열이어야 합니다.`,
  mustNotBeEmpty: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 비워 둘 수 없습니다.`,
  mustBeInteger: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 정수여야 합니다.`,
  mustBeBoolean: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) boolean이어야 합니다.`,
  mustBeStringArray: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 문자열 배열이어야 합니다.`,
  mustBeInRange: (parameter: string, minimum: number, maximum: number): string =>
    `매개변수 "${parameter}"은(는) ${minimum} 이상 ${maximum} 이하여야 합니다.`,
  mustBeOneOf: (parameter: string, choices: readonly string[]): string =>
    `매개변수 "${parameter}"은(는) 다음 중 하나여야 합니다: ${choices.join(", ")}.`,
  mustUseDateFormat: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) YYYYMMDD 형식이어야 합니다.`,
  mustBeRealDate: (parameter: string, actual: string): string =>
    `매개변수 "${parameter}"은(는) YYYYMMDD 형식의 실제 날짜여야 합니다. "${actual}"은(는) 유효한 날짜가 아닙니다.`,
  startDateMustNotBeAfterEndDate: (startDate: string, endDate: string): string =>
    `검색 시작일은 종료일보다 늦을 수 없습니다. startDate=${startDate}, endDate=${endDate}.`,
  mustUseDartCompanyCode: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 8자리 DART 회사 코드여야 합니다. 회사명이나 6자리 종목코드는 사용할 수 없습니다. 예: 삼성전자 DART 회사 코드 00126380.`,
  mustUseKnownPattern: (parameter: string, expected: string): string =>
    `매개변수 "${parameter}"은(는) ${expected} 형식이어야 합니다.`,
  mustUseDisclosureTypeCodes: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) DART 공시유형 상세 코드 배열이어야 합니다. 예: ["A001"](사업보고서), ["I001"](수시공시). "사업보고서" 같은 보고서명 텍스트로 좁히려면 reportName을 사용하세요.`,
  mustUseIndustryCode: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) "all", DART 업종 코드(예: 612=전기 통신업), 또는 ROOTdddd 형식의 DART 업종 tree root여야 합니다. 업종을 모르면 "all"을 사용하세요.`,
  mustUseCorporationType: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), E(기타법인) 중 하나여야 합니다.`,
  mustUseClosingAccountsMonth: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) all 또는 01부터 12까지의 두 자리 결산월 코드여야 합니다. 예: 1월은 "01", 12월은 "12"입니다.`,
  invalidParameter: (parameter: string): string =>
    `매개변수 "${parameter}"이(가) 올바르지 않습니다.`,
  unknownParameter: (parameter: string): string =>
    `알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
