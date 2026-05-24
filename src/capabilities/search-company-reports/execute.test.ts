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
          "No DART company filing results. Check that the search period is 10 years or less, then adjust the date window or remove reportName/presenterName/disclosureTypes/industryCode/corporationType/closingAccountsMonth filters and search again.",
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
          "matchedDisclosureType is ambiguous because the search used multiple disclosure type codes. Search again with exactly one disclosureTypes value when you need row-level attribution.",
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
      expect(error.recoveryHint).toContain("8-digit companyCode");
    }
  });

  test("adds a recovery hint for date windows wider than 10 years", async () => {
    try {
      await executeSearchCompanyReports(
        {
          companyCode: "00571818",
          startDate: "20160523",
          endDate: "20260524",
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
      expect(error.parameter).toBe("startDate");
      expect(error.message).toContain("10 years");
      expect(error.recoveryHint).toBe(
        "Because of DART behavior, call search-company-reports with date windows of 10 years or less.",
      );
    }
  });

  test("adds recovery hints for invalid DART code filters", async () => {
    const cases = [
      {
        input: { disclosureTypes: ["A999"] },
        parameter: "disclosureTypes",
        expectedHintParts: [
          "A001=사업보고서",
          "disclosure-types",
          "darty disclosure-types --query <term>",
          "reportName",
        ],
      },
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
        expectedHintParts: ["01 through 12", "January is 01"],
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
