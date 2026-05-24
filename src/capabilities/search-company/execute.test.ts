import { describe, expect, test } from "bun:test";

import { SearchCompanyFailure } from "./contract.ts";
import { executeSearchCompany } from "./execute.ts";
import { SearchCompanyProviderError } from "./provider.ts";

describe("executeSearchCompany", () => {
  test("adds an evidence-backed warning when company-name search has no rows", async () => {
    const result = await executeSearchCompany(
      { companyName: "없는회사명" },
      {
        search: async () => ({
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            returnedCount: 0,
          },
          items: [],
          metadata: {
            fetchedAt: "2026-05-07T00:00:00.000Z",
            source: {
              system: "dart",
              surface: "dsae001",
              endpoint: "https://dart.fss.or.kr/dsae001/search.ax",
            },
            sourceBehavior: {
              searchMode: "company",
              callerControlsPageSize: true,
              maxObservedPageSize: 45,
              observationStatus: "observed",
            },
            completeness: "complete",
            droppedItemCount: 0,
          },
          references: {
            searchUrl: "https://dart.fss.or.kr/dsae001/search.ax",
          },
          warnings: [],
        }),
      },
    );

    expect(result.warnings).toEqual([
      {
        code: "no_results",
        message:
          "No DART 기업개황 company-name results. Try a shorter company-name fragment. Business registration number and corporate registration number search modes are not supported by this tool.",
      },
    ]);
  });

  test("rejects invalid input before calling the provider", async () => {
    let providerCalled = false;

    try {
      await executeSearchCompany({}, {
        search: async () => {
          providerCalled = true;
          throw new Error("Provider should not be called.");
        },
      });
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(providerCalled).toBe(false);
      expect(error).toBeInstanceOf(SearchCompanyFailure);

      if (!(error instanceof SearchCompanyFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("companyName");
    }
  });

  test("adds a search-company pagination hint for unsupported limit", async () => {
    let providerCalled = false;

    try {
      await executeSearchCompany(
        { companyName: "삼성전자", limit: 10 },
        {
          search: async () => {
            providerCalled = true;
            throw new Error("Provider should not be called.");
          },
        },
      );
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(providerCalled).toBe(false);
      expect(error).toBeInstanceOf(SearchCompanyFailure);

      if (!(error instanceof SearchCompanyFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("limit");
      expect(error.recoveryHint).toContain("limit is not supported");
      expect(error.recoveryHint).toContain("search-company");
      expect(error.recoveryHint).toContain("pageSize (1-45)");
    }
  });

  test("normalizes provider source errors", async () => {
    try {
      await executeSearchCompany({ companyName: "삼성전자" }, {
        search: async () => {
          throw new SearchCompanyProviderError({
            code: "source_changed",
            message: "changed",
            retryable: false,
            providerId: "test",
            sourceUrl: "https://dart.fss.or.kr/dsae001/search.ax",
          });
        },
      });
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(SearchCompanyFailure);

      if (!(error instanceof SearchCompanyFailure)) {
        throw error;
      }

      expect(error.code).toBe("source_changed");
      expect(error.sourceUrl).toBe("https://dart.fss.or.kr/dsae001/search.ax");
    }
  });
});
