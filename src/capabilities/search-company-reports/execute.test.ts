import { describe, expect, test } from "bun:test";

import { SearchCompanyReportsFailure } from "./contract.ts";
import { executeSearchCompanyReports } from "./execute.ts";
import type {
  SearchCompanyReportsProvider,
  SearchCompanyReportsProviderResult,
} from "./provider.ts";

const unusedProvider: SearchCompanyReportsProvider = {
  search: async () => {
    throw new Error("provider should not be called for invalid requests");
  },
};

const successfulProviderResult = {
  company: { companyCode: "00190321", name: "케이티" },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 1,
    returnedCount: 1,
  },
  items: [
    {
      company: { companyCode: "00190321", name: "케이티" },
      filing: {
        receiptNumber: "20260331004166",
        reportTitle: "사업보고서",
        receiptDate: "2026-03-31",
      },
      references: {
        viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
      },
      remarks: [],
      evidence: { rawRowText: "케이티 사업보고서 2026.03.31" },
    },
  ],
  metadata: {
    fetchedAt: "2026-05-07T00:00:00.000Z",
    source: {
      system: "dart",
      surface: "dsab007",
      endpoint: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
    },
    sourceBehavior: {
      searchMode: "corp",
      sortBy: "date",
      callerControlsPageSize: true,
      pageSizeChoices: [15, 30, 50, 100],
      finalReportDefault: true,
      observationStatus: "observed",
    },
    completeness: "complete",
    droppedItemCount: 0,
  },
  references: {
    searchUrl: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
  },
  warnings: [],
} satisfies SearchCompanyReportsProviderResult;

const successfulProvider: SearchCompanyReportsProvider = {
  search: async () => successfulProviderResult,
};

describe("executeSearchCompanyReports", () => {
  test("attributes rows to the single requested disclosure type", async () => {
    const result = await executeSearchCompanyReports(
      {
        companyCode: "00190321",
        startDate: "20250101",
        endDate: "20251231",
        disclosureTypes: ["A001"],
      },
      successfulProvider,
    );

    expect(result.result.items[0]?.matchedDisclosureType).toEqual({
      code: "A001",
      label: "사업보고서",
      category: "A",
      categoryLabel: "정기공시",
      evidence: { source: "single_disclosure_type_request" },
    });
    expect(result.warnings).toEqual([]);
  });

  test("adds an evidence-backed warning for no-result filing searches", async () => {
    const result = await executeSearchCompanyReports(
      {
        companyCode: "00190321",
        startDate: "20250101",
        endDate: "20251231",
        reportName: "없는보고서명",
      },
      {
        search: async () => ({
          ...successfulProviderResult,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            returnedCount: 0,
          },
          items: [],
        }),
      },
    );

    expect(result.warnings).toEqual([
      {
        code: "no_results",
        message:
          "DART 회사별 공시 검색 결과가 없습니다. 날짜 범위를 넓히거나 reportName/presenterName/disclosureTypes/industryCode/corporationType/closingAccountsMonth 필터를 줄여 다시 검색하세요.",
      },
    ]);
  });

  test("warns about ambiguous row attribution for multiple disclosure types", async () => {
    const result = await executeSearchCompanyReports(
      {
        companyCode: "00190321",
        startDate: "20250101",
        endDate: "20251231",
        disclosureTypes: ["A001", "I001"],
      },
      successfulProvider,
    );

    expect(result.result.items[0]?.matchedDisclosureType).toBeUndefined();
    expect(result.warnings).toEqual([
      {
        code: "matched_disclosure_type_ambiguous",
        message:
          "여러 공시유형 코드로 검색해 DART 결과 행의 matchedDisclosureType이 모호합니다. 행별 공시유형 귀속이 필요하면 disclosureTypes를 하나만 지정해 다시 검색하세요.",
      },
    ]);
  });

  test("adds a recovery hint when companyCode looks like a stock code", async () => {
    try {
      await executeSearchCompanyReports(
        {
          companyCode: "005930",
          startDate: "20250101",
          endDate: "20251231",
        },
        unusedProvider,
      );
      throw new Error("Expected search-company-reports execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(SearchCompanyReportsFailure);

      if (!(error instanceof SearchCompanyReportsFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("companyCode");
      expect(error.recoveryHint).toContain("search-company");
      expect(error.recoveryHint).toContain("8자리 companyCode");
    }
  });

  test("adds recovery hints for invalid DART code filters", async () => {
    const cases = [
      {
        input: { industryCode: "전기 통신업" },
        parameter: "industryCode",
        expectedHintParts: ["612=전기 통신업", '"all"'],
      },
      {
        input: { corporationType: "KOSPI" },
        parameter: "corporationType",
        expectedHintParts: ["P(유가증권시장)", "E(기타법인)"],
      },
      {
        input: { closingAccountsMonth: "1" },
        parameter: "closingAccountsMonth",
        expectedHintParts: ["01~12", "1월은 01"],
      },
    ] as const;

    for (const testCase of cases) {
      try {
        await executeSearchCompanyReports(
          {
            companyCode: "00190321",
            startDate: "20250101",
            endDate: "20251231",
            ...testCase.input,
          } as Parameters<typeof executeSearchCompanyReports>[0],
          unusedProvider,
        );
        throw new Error("Expected search-company-reports execution to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(SearchCompanyReportsFailure);

        if (!(error instanceof SearchCompanyReportsFailure)) {
          throw error;
        }

        expect(error.code).toBe("invalid_request");
        expect(error.parameter).toBe(testCase.parameter);

        for (const expectedHintPart of testCase.expectedHintParts) {
          expect(error.recoveryHint).toContain(expectedHintPart);
        }
      }
    }
  });
});
