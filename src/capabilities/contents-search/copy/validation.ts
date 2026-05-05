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
