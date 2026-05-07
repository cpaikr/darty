import { describe, expect, test } from "bun:test";

import { executeCompanyDetail } from "./execute.ts";
import { CompanyDetailFailure } from "./contract.ts";
import { CompanyDetailProviderError, type CompanyDetailProvider } from "./provider.ts";

describe("executeCompanyDetail", () => {
  test("maps provider not_found errors into capability failures", async () => {
    const provider: CompanyDetailProvider = {
      detail: async () => {
        throw new CompanyDetailProviderError({
          code: "not_found",
          message:
            "DART 기업개황 상세에서 회사 코드 99999999에 해당하는 회사를 찾지 못했습니다.",
          retryable: false,
          providerId: "test",
          sourceUrl:
            "https://dart.fss.or.kr/dsae001/select.ax?selectKey=99999999",
        });
      },
    };

    try {
      await executeCompanyDetail({ companyCode: "99999999" }, provider);
      throw new Error("Expected company detail execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CompanyDetailFailure);

      if (!(error instanceof CompanyDetailFailure)) {
        throw error;
      }

      expect(error.code).toBe("not_found");
      expect(error.retryable).toBe(false);
      expect(error.sourceUrl).toBe(
        "https://dart.fss.or.kr/dsae001/select.ax?selectKey=99999999",
      );
    }
  });
});
