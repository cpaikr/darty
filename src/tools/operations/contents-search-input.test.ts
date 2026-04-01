import { describe, expect, test } from "bun:test";

import {
  InvalidContentsSearchInput,
  resolveContentsSearchInput,
  toContentsSearchResult,
  toContentsSearchReplayInput,
} from "./contents-search-input.ts";

describe("resolveContentsSearchInput", () => {
  test("applies defaults to the semantic request", () => {
    expect(
      resolveContentsSearchInput({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      maxLinks: 10,
      sortBy: "date",
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

  test("rejects missing required parameters with structured data", () => {
    try {
      resolveContentsSearchInput({
        startDate: "20250331",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchInput);

      if (!(error instanceof InvalidContentsSearchInput)) {
        throw error;
      }

      expect(error.code).toBe("missing_parameter");
      expect(error.parameter).toBe("keyword");
      expect(error.reason).toBe("required");
      expect(error.expected).toBe("a non-empty string");
    }
  });

  test("rejects invalid date formats with structured data", () => {
    try {
      resolveContentsSearchInput({
        keyword: "배당",
        startDate: "2025-03-31",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchInput);

      if (!(error instanceof InvalidContentsSearchInput)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("startDate");
      expect(error.reason).toBe("invalid_format");
      expect(error.expected).toBe("YYYYMMDD");
      expect(error.actual).toBe("2025-03-31");
    }
  });

  test("rejects unknown semantic parameters", () => {
    try {
      resolveContentsSearchInput({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        currentPage: 2,
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchInput);

      if (!(error instanceof InvalidContentsSearchInput)) {
        throw error;
      }

      expect(error.code).toBe("unknown_parameter");
      expect(error.parameter).toBe("currentPage");
    }
  });
});

describe("toContentsSearchReplayInput", () => {
  test("maps semantic names to the internal DART replay contract", () => {
    const request = resolveContentsSearchInput({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyName: "삼성전자",
      presenterName: "IR",
      page: 2,
      limit: 25,
      sortBy: "reportName",
      sortDirection: "asc",
    });

    expect(toContentsSearchReplayInput(request)).toEqual({
      option: "contents",
      currentPage: 2,
      maxResults: 25,
      maxLinks: 10,
      sort: "rpt_nm",
      sortType: "asc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      textCrpCik: undefined,
      textCrpNm: "삼성전자",
      textPresenterNm: "IR",
      lateKeyword: undefined,
      flrCik: undefined,
      dspTypeTab: undefined,
      tocSrch: undefined,
      docType: undefined,
      reportName: undefined,
      decadeType: undefined,
    });
  });

  test("replaces the echoed request with the resolved semantic contract", () => {
    const request = resolveContentsSearchInput({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
    });

    const result = toContentsSearchResult(request, {
      request: toContentsSearchReplayInput(request),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        returnedCount: 1,
      },
      rows: [],
      fetchedAt: "2026-03-31T00:00:00.000Z",
      sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
    });

    expect(result.request).toEqual(request);
  });
});
