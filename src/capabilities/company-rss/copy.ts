export const companyRssFieldCopy = {
  companyCode: {
    description: "[필수] DART 8자리 회사 코드입니다. 예: 삼성전자 00126380.",
    cliDescription: "[필수] DART 8자리 회사 코드입니다. 예: 삼성전자 00126380.",
  },
} as const;

export const companyRssCliCopy = {
  summary: "DART 회사별 공시 RSS를 조회합니다.",
  examplesHeading: "예시",
  examples: [
    {
      description: "DART 회사 코드로 회사별 공시 RSS를 조회합니다.",
      argv: ["--company-code", "00126380"],
    },
  ],
} as const;

export const companyRssFailureCopy = {
  unexpectedCompanyRss: "회사 RSS 조회 중 예상하지 못한 내부 오류가 발생했습니다.",
} as const;

export const companyRssSchemaCopy = {
  requestDescription: "DART 회사별 공시 RSS 조회 입력입니다. 필수: companyCode.",
  requestExamples: [{ companyCode: "00126380", detail: "concise" }],
  resultDescription: "성공한 company-rss 결과 객체입니다. RSS 채널, 공시 항목, 메타데이터, 참조 URL을 포함합니다.",
} as const;

export const companyRssToolCopy = {
  title: "DART 회사 RSS 조회",
  description:
    "DART 회사별 공시 RSS에서 8자리 DART 회사 코드에 해당하는 최근 공시 항목을 조회합니다.",
} as const;

export const companyRssValidationCopy = {
  inputExpected: "company_rss_parameters_object",
  inputMustBeObject: "company-rss 입력은 의미 기반 매개변수를 담은 객체여야 합니다.",
  expectedCompanyCode: "8자리 DART 회사 코드",
  missingRequired: (parameter: string, expectedDescription: string): string =>
    `필수 매개변수 "${parameter}"이(가) 없습니다. 필요한 값: ${expectedDescription}.`,
  mustBeString: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 문자열이어야 합니다.`,
  invalidCompanyCode: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) 8자리 DART 회사 코드여야 합니다.`,
  expectedDetail: "concise, detailed, raw 중 하나",
  invalidDetail: (parameter: string): string =>
    `매개변수 "${parameter}"은(는) concise, detailed, raw 중 하나여야 합니다.`,
  unknownParameter: (parameter: string): string =>
    `알 수 없는 매개변수입니다: "${parameter}".`,
} as const;
