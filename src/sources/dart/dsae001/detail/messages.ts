export const dsae001DetailMessages = {
  sourceUnavailable: "DART 기업개황 상세 정보를 가져오지 못했습니다.",
  htmlDecodeFailure: "DART 기업개황 상세 HTML을 읽지 못했습니다.",
  missingDetailTable: "DART 기업개황 상세 결과에서 상세 표를 찾지 못했습니다.",
  missingCompanyName: "DART 기업개황 상세 결과에서 회사이름을 찾지 못했습니다.",
  companyNotFound: (companyCode: string): string =>
    `DART 기업개황 상세에서 회사 코드 ${companyCode}에 해당하는 회사를 찾지 못했습니다.`,
  sourceSchemaMismatch: "DART 기업개황 상세 결과가 예상한 스키마와 다릅니다.",
  internalProvider: "DART 기업개황 상세 처리 중 내부 오류가 발생했습니다.",
} as const;
