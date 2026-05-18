export const dsaf001ReportMessages = {
  sourceUnavailable: "DART 보고서 viewer에 접근할 수 없습니다.",
  htmlDecodeFailure: "DART 보고서 HTML을 해석할 수 없습니다.",
  shellChanged: "DART 보고서 viewer 구조가 예상과 다릅니다.",
  documentNotFound: (documentId: string) =>
    `문서 ID "${documentId}"을(를) 이 접수번호에서 찾을 수 없습니다. receipt로 view-report를 다시 호출하고 반환된 documents[].id를 사용하세요. DART dcmNo를 documentId로 넘기지 마세요.`,
  sectionNotFound: (sectionId: string) =>
    `섹션 ID "${sectionId}"을(를) 이 문서 목차에서 찾을 수 없습니다. 같은 receipt/documentId로 view-report를 다시 호출하고 반환된 toc[].id를 사용하세요. 섹션 ID는 연도, 정정, 다른 접수번호에 재사용할 수 없습니다.`,
  internalProvider: "DART 보고서 provider에서 예상하지 못한 오류가 발생했습니다.",
} as const;
