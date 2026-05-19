export const disclosureTypesFieldCopy = {
  category: {
    description:
      "공시상세유형 대분류입니다. A부터 J까지의 DART 코드 접두사 중 하나입니다. 생략하면 전체 대분류를 반환합니다.",
    cliDescription:
      "공시상세유형 대분류(A-J)로 좁힙니다. 생략하면 전체 목록을 반환합니다.",
  },
  query: {
    description:
      "코드 또는 한국어 라벨에 포함된 문자열로 공시상세유형 코드를 찾습니다. 예: 사업보고서, 수시공시, A001.",
    cliDescription:
      "코드 또는 한국어 라벨 검색어입니다. 예: 사업보고서, 수시공시, A001.",
  },
} as const;

export const disclosureTypesCliCopy = {
  summary: "DART 공시상세유형 코드를 조회합니다.",
  examplesHeading: "예시",
  examples: [
    {
      description: "전체 공시상세유형 코드 목록을 출력합니다.",
      argv: [],
    },
    {
      description: "A 대분류(정기공시 계열) 코드만 출력합니다.",
      argv: ["--category", "A"],
    },
    {
      description: "라벨 또는 코드에 사업보고서가 들어간 코드를 찾습니다.",
      argv: ["--query", "사업보고서"],
    },
  ],
  notesHeading: "검색 팁",
  notes: [
    "search-company-reports의 `--disclosure-type`에는 이 명령이 반환하는 A001, I001 같은 상세 코드를 전달하세요.",
    "보고서 제목 텍스트로 검색하려면 search-company-reports의 `--report-name`을 사용하세요.",
  ],
} as const;

export const disclosureTypesFailureCopy = {
  unexpectedDisclosureTypes:
    "공시상세유형 코드 조회 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const disclosureTypesSchemaCopy = {
  requestDescription:
    "DART 공시상세유형 코드 discovery 입력입니다. category와 query를 생략하면 전체 코드 메뉴를 반환합니다.",
  requestExamples: [{ category: "A" }, { query: "사업보고서" }, {}],
  resultDescription:
    "DART 공시상세유형 코드 discovery 결과 객체입니다. search-company-reports의 disclosureTypes 입력에 사용할 수 있는 상세 코드와 라벨을 반환합니다.",
} as const;

export const disclosureTypesToolCopy = {
  title: "DART 공시상세유형 코드 조회",
  description:
    "search-company-reports의 disclosureTypes/--disclosure-type에 넣을 DART 공시상세유형 상세 코드를 조회합니다. category(A-J)나 query로 좁힐 수 있습니다.",
} as const;

export const disclosureTypesValidationCopy = {
  inputExpected: "disclosure_types_parameters_object",
  inputMustBeObject:
    "disclosure-types 입력은 의미 기반 매개변수를 담은 객체여야 합니다.",
  expectedCategory: "A부터 J까지의 공시상세유형 대분류 코드",
  expectedNonEmptyString: "비어 있지 않은 문자열",
  mustBeString: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 문자열이어야 합니다.`,
  mustNotBeEmpty: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 비워 둘 수 없습니다.`,
  mustUseCategory: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) A부터 J까지의 공시상세유형 대분류 코드여야 합니다.`,
  unknownParameter: (parameter: string): string =>
    `알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
