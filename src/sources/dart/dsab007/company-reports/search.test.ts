import { describe, expect, test } from "bun:test";

import {
  observedSearchCompanyReportsBehavior,
  toDsab007CompanyReportsProviderResult,
  toDsab007CompanyReportsReplayInput,
} from "./search.ts";

describe("toDsab007CompanyReportsReplayInput", () => {
  test("maps public input to the internal company-report replay fields", () => {
    expect(
      toDsab007CompanyReportsReplayInput({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        page: 2,
        pageSize: 30,
        sortDirection: "asc",
        includeAllReports: true,
      }),
    ).toEqual({
      option: "corp",
      currentPage: 2,
      maxResults: 30,
      maxLinks: 10,
      sort: "date",
      series: "asc",
      textCrpCik: "00190321",
      startDate: "20250507",
      endDate: "20260507",
      finalReportOnly: false,
    });
  });
});

describe("toDsab007CompanyReportsProviderResult", () => {
  test("maps parsed source rows into the capability-owned provider result", () => {
    const result = toDsab007CompanyReportsProviderResult({
      request: {
        option: "corp",
        currentPage: 1,
        maxResults: 15,
        maxLinks: 10,
        sort: "date",
        series: "desc",
        textCrpCik: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        finalReportOnly: true,
      },
      company: {
        companyCode: "00190321",
        name: "케이티",
        marketLabel: "유가증권시장",
      },
      pagination: {
        currentPage: 1,
        totalPages: 12,
        totalCount: 169,
        returnedCount: 1,
      },
      rows: [
        {
          companyCode: "00190321",
          companyName: "케이티",
          companyMarketLabel: "유가증권시장",
          reportTitle: "기업설명회(IR)개최(안내공시)",
          rcpNo: "20260504800404",
          presenterName: "케이티",
          receiptDate: "2026-05-04",
          viewerPath: "/dsaf001/main.do?rcpNo=20260504800404",
          viewerUrl:
            "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260504800404",
          remarks: [{ text: "유", title: "거래소 소관" }],
          rawRowText: "1 케이티 기업설명회(IR)개최(안내공시) 케이티 2026.05.04 유",
        },
      ],
      warnings: [
        {
          code: "row_parse_failed",
          rowIndex: 2,
          message: "DART 회사별 공시 결과 행을 파싱하지 못했습니다.",
        },
      ],
      droppedRowCount: 1,
      fetchedAt: "2026-05-07T00:00:00.000Z",
      sourceUrl: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
    });

    expect(result).toEqual({
      company: {
        companyCode: "00190321",
        name: "케이티",
        marketLabel: "유가증권시장",
      },
      pagination: {
        currentPage: 1,
        totalPages: 12,
        totalCount: 169,
        returnedCount: 1,
      },
      items: [
        {
          company: {
            companyCode: "00190321",
            name: "케이티",
            marketLabel: "유가증권시장",
          },
          filing: {
            receiptNumber: "20260504800404",
            reportTitle: "기업설명회(IR)개최(안내공시)",
            receiptDate: "2026-05-04",
            presenterName: "케이티",
          },
          references: {
            viewerUrl:
              "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260504800404",
          },
          remarks: [{ text: "유", title: "거래소 소관" }],
          evidence: {
            rawRowText:
              "1 케이티 기업설명회(IR)개최(안내공시) 케이티 2026.05.04 유",
          },
        },
      ],
      metadata: {
        fetchedAt: "2026-05-07T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsab007",
          endpoint: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
        },
        sourceBehavior: observedSearchCompanyReportsBehavior,
        completeness: "partial",
        droppedItemCount: 1,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
      },
      warnings: [
        {
          code: "partial_rows_dropped",
          message: "검색 결과 행 1개를 파싱하지 못해 생략했습니다.",
          droppedItemCount: 1,
        },
      ],
    });
  });
});
