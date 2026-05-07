import { describe, expect, test } from "bun:test";

import { InvalidCompanyRssRequest, resolveCompanyRssRequest } from "./contract.ts";

describe("resolveCompanyRssRequest", () => {
  test("accepts an 8-digit DART company code", () => {
    expect(resolveCompanyRssRequest({ companyCode: "00126380" })).toEqual({
      companyCode: "00126380",
    });
  });

  test("rejects stock-code-shaped values", () => {
    try {
      resolveCompanyRssRequest({ companyCode: "005930" });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCompanyRssRequest);

      if (!(error instanceof InvalidCompanyRssRequest)) {
        throw error;
      }

      expect(error.parameter).toBe("companyCode");
      expect(error.reason).toBe("invalid_format");
    }
  });
});
