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
