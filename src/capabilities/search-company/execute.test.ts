import { describe, expect, test } from "bun:test";

import { SearchCompanyFailure } from "./contract.ts";
import { executeSearchCompany } from "./execute.ts";
import { SearchCompanyProviderError } from "./provider.ts";

describe("executeSearchCompany", () => {
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
