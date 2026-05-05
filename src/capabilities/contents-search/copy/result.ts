export const contentsSearchResultCopy = {
  partialRowsDropped: (droppedItemCount: number): string =>
    `검색 결과 행 ${droppedItemCount}개를 파싱하지 못해 생략했습니다.`,
} as const;
