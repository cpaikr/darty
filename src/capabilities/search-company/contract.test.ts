import { describe, expect, test } from "bun:test";

import {
  InvalidSearchCompanyRequest,
  resolveSearchCompanyRequest,
} from "./contract.ts";

describe("resolveSearchCompanyRequest", () => {
  test("applies defaults to the public semantic request", () => {
    expect(resolveSearchCompanyRequest({ companyName: "삼성전자" })).toEqual({
      page: 1,
      pageSize: 45,
      companyName: "삼성전자",
    });
  });

  test("trims company names", () => {
    expect(resolveSearchCompanyRequest({ companyName: " 삼성전자 " }).companyName).toBe(
      "삼성전자",
    );
  });

  test("rejects missing company names with structured data", () => {
    try {
      resolveSearchCompanyRequest({});
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyRequest);

      if (!(error instanceof InvalidSearchCompanyRequest)) {
        throw error;
      }

      expect(error.code).toBe("missing_parameter");
      expect(error.parameter).toBe("companyName");
      expect(error.reason).toBe("required");
    }
  });

  test("rejects one-character company names", () => {
    try {
      resolveSearchCompanyRequest({ companyName: "삼" });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyRequest);

      if (!(error instanceof InvalidSearchCompanyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("companyName");
      expect(error.reason).toBe("too_short");
    }
  });

  test("rejects page sizes above the observed source maximum", () => {
    try {
      resolveSearchCompanyRequest({ companyName: "삼성", pageSize: 46 });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyRequest);

      if (!(error instanceof InvalidSearchCompanyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("pageSize");
      expect(error.reason).toBe("out_of_range");
      expect(error.expected).toBe("integer_between_1_and_45");
    }
  });

  test("rejects unknown public parameters", () => {
    try {
      resolveSearchCompanyRequest({
        companyName: "삼성전자",
        stockCode: "005930",
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyRequest);

      if (!(error instanceof InvalidSearchCompanyRequest)) {
        throw error;
      }

      expect(error.code).toBe("unknown_parameter");
      expect(error.parameter).toBe("stockCode");
    }
  });
});
