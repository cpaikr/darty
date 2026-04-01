import { describe, expect, test } from "bun:test";

import {
  resolveContentsSearchInput,
  toContentsSearchReplayInput,
} from "./contents-search-input.ts";
import {
  executeContentsSearch,
  executeResolvedContentsSearch,
} from "./contents-search-operation.ts";

describe("executeContentsSearch", () => {
  test("resolves semantic raw input, executes the DART replay, and returns a semantic result", async () => {
    let receivedInput:
      | ReturnType<typeof toContentsSearchReplayInput>
      | undefined;

    const result = await executeContentsSearch(
      {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        page: 2,
        sortBy: "reportName",
      },
      {
        runSearch: async (input) => {
          receivedInput = input;

          return {
            request: input,
            pagination: {
              currentPage: 2,
              totalPages: 3,
              totalCount: 21,
              returnedCount: 10,
            },
            rows: [],
            fetchedAt: "2026-03-31T00:00:00.000Z",
            sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
          };
        },
      },
    );

    expect(receivedInput).toEqual({
      option: "contents",
      currentPage: 2,
      maxResults: 10,
      maxLinks: 10,
      sort: "rpt_nm",
      sortType: "desc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      textCrpCik: undefined,
      textCrpNm: undefined,
      textPresenterNm: undefined,
      lateKeyword: undefined,
      flrCik: undefined,
      dspTypeTab: undefined,
      tocSrch: undefined,
      docType: undefined,
      reportName: undefined,
      decadeType: undefined,
    });
    expect(result.request).toEqual({
      page: 2,
      limit: 10,
      maxLinks: 10,
      sortBy: "reportName",
      sortDirection: "desc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: undefined,
      companyName: undefined,
      presenterName: undefined,
      secondaryKeyword: undefined,
      filerCode: undefined,
      disclosureTypeTab: undefined,
      tocSearch: undefined,
      documentType: undefined,
      reportName: undefined,
      decadeType: undefined,
    });
  });

  test("can execute directly from a resolved semantic request", async () => {
    const request = resolveContentsSearchInput({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
    });

    const result = await executeResolvedContentsSearch(request, {
      runSearch: async (input) => ({
        request: input,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          returnedCount: 1,
        },
        rows: [],
        fetchedAt: "2026-03-31T00:00:00.000Z",
        sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
      }),
    });

    expect(result.request).toEqual(request);
  });
});
