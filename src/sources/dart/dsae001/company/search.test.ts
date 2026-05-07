import { describe, expect, test } from "bun:test";

import {
  toDsae001CompanyProviderResult,
  toDsae001CompanyReplayInput,
} from "./search.ts";

describe("toDsae001CompanyReplayInput", () => {
  test("maps public search-company input to the company replay fields", () => {
    expect(
      toDsae001CompanyReplayInput({
        page: 2,
        pageSize: 20,
        companyName: "삼성",
      }),
    ).toEqual({
      currentPage: 2,
      maxResults: 20,
      searchType: "1",
      textCrpNm: "삼성",
    });
  });
});

describe("toDsae001CompanyProviderResult", () => {
  test("maps source rows to public company items", () => {
    const result = toDsae001CompanyProviderResult({
      request: {
        currentPage: 1,
        maxResults: 45,
        searchType: "1",
        textCrpNm: "삼성전자",
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        returnedCount: 1,
      },
      rows: [
        {
          companyCode: "00126380",
          companyName: "삼성전자",
          stockCode: "005930",
          marketKind: "kospi",
          marketLabel: "유가증권시장",
          rawCompanyLinkHref: "javascript:select('00126380');",
          rawMarketBadgeText: "유",
        },
      ],
      warnings: [],
      droppedRowCount: 0,
      fetchedAt: "2026-05-07T00:00:00.000Z",
      sourceUrl: "https://dart.fss.or.kr/dsae001/search.ax",
    });

    expect(result.items[0]).toMatchObject({
      companyCode: "00126380",
      companyName: "삼성전자",
      stockCode: "005930",
      references: {
        detailEndpoint:
          "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380",
      },
    });
    expect(result.metadata.source.surface).toBe("dsae001");
  });
});
