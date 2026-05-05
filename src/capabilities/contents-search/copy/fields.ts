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
