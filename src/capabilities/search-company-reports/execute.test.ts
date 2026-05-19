import { describe, expect, test } from "bun:test";

import { SearchCompanyReportsFailure } from "./contract.ts";
import { executeSearchCompanyReports } from "./execute.ts";
import type { SearchCompanyReportsProvider } from "./provider.ts";

const unusedProvider: SearchCompanyReportsProvider = {
  search: async () => {
    throw new Error("provider should not be called for invalid requests");
  },
};

describe("executeSearchCompanyReports", () => {
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
