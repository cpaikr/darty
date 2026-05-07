import { describe, expect, test } from "bun:test";

import {
  InvalidCompanyDetailRequest,
  resolveCompanyDetailRequest,
} from "./contract.ts";

describe("resolveCompanyDetailRequest", () => {
  test("accepts an 8-digit DART company code", () => {
    expect(resolveCompanyDetailRequest({ companyCode: "00126380" })).toEqual({
      companyCode: "00126380",
    });
  });

  test("rejects stock-code-shaped values", () => {
    try {
      resolveCompanyDetailRequest({ companyCode: "005930" });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCompanyDetailRequest);

      if (!(error instanceof InvalidCompanyDetailRequest)) {
        throw error;
      }

      expect(error.parameter).toBe("companyCode");
      expect(error.reason).toBe("invalid_format");
    }
  });
});
