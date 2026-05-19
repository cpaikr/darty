export const searchCompanyFieldCopy = {
  companyName: {
    description: "[필수] DART 기업개황 회사별 검색의 회사명 검색어입니다. 최소 2자 이상 입력합니다.",
    cliDescription: "[필수] DART 기업개황 회사별 검색의 회사명 검색어입니다. 최소 2자 이상 입력합니다.",
  },
  page: {
    description: "[기본값: 1] DART 기업개황 회사별 검색 결과 페이지입니다(1부터 시작).",
    cliDescription: "[기본값: 1] DART 기업개황 회사별 검색 결과 페이지입니다(1부터 시작).",
  },
  pageSize: {
    description: "[기본값: 15] 한 페이지에 요청할 회사 수입니다. DART 회사별 검색에서 관찰된 최대값은 45입니다.",
    cliDescription: "[기본값: 15] 한 페이지에 요청할 회사 수입니다(최대 45).",
  },
} as const;

export const searchCompanyCliCopy = {
  summary: "DART 기업개황 회사별 검색으로 DART 회사 코드(8자리)를 찾습니다.",
  examplesHeading: "예시",
  examples: [
    {
      description: "회사명으로 DART 회사 고유코드(8자리)를 찾습니다.",
      argv: ["--company-name", "삼성전자"],
    },
    {
      description: "많은 결과가 있는 회사명 검색의 다음 페이지를 조회합니다.",
      argv: ["--company-name", "삼성", "--page", "2", "--page-size", "20"],
    },
  ],
  notesHeading: "검색 팁",
  notes: [
    "결과의 companyCode는 DART가 회사 링크 select('00126380')에 포함하는 회사 고유코드(8자리)입니다.",
    "stockCode는 상장회사에만 표시되는 6자리 종목코드이며, DART 회사 코드와 다릅니다.",
  ],
  invalidInteger: (value: string): string =>
    `정수를 입력해야 하지만 "${value}"을(를) 받았습니다.`,
} as const;

export const searchCompanyFailureCopy = {
  unexpectedSearchCompany: "회사 검색 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const searchCompanyResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `검색 결과 행 ${droppedItemCount}개를 파싱하지 못해 생략했습니다.`,
} as const;

export const searchCompanySchemaCopy = {
  requestDescription:
    "DART 기업개황 `회사별` 모드의 회사명 검색 입력입니다. 필수: companyName.",
  requestExamples: [{ companyName: "삼성전자", page: 1, pageSize: 15 }],
  resultDescription:
    "성공한 search-company 결과 객체입니다. 회사 검색 결과, 메타데이터, 참조 URL, 경고를 포함합니다.",
} as const;

export const searchCompanyToolCopy = {
  title: "DART 회사별 검색",
  description:
    "DART 기업개황의 `회사별` 모드로 회사를 검색하고, 결과 행에서 DART 회사 고유코드(8자리)와 6자리 종목코드(있는 경우)를 반환합니다.",
} as const;

export const searchCompanyValidationCopy = {
  inputExpected: "search_company_parameters_object",
  inputMustBeObject:
    "search-company 입력은 의미 기반 매개변수를 담은 객체여야 합니다.",
  expectedNonEmptyString: "2자 이상의 문자열",
  expectedIntegerBetween: (minimum: number, maximum: number): string =>
    `${minimum} 이상 ${maximum} 이하의 정수`,
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 문자열이어야 합니다.`,
  mustBeInteger: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 정수여야 합니다.`,
  mustBeInRange: (parameter: string, minimum: number, maximum: number): string =>
    `매개변수 "${parameter}"은(는) ${minimum} 이상 ${maximum} 이하여야 합니다.`,
  mustBeAtLeastTwoChars: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 2자 이상이어야 합니다.`,
  unknownParameter: (parameter: string): string =>
    `알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
