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
});
