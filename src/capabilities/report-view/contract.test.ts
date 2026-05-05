import { describe, expect, test } from "bun:test";

import {
  InvalidReportViewRequest,
  resolveReportViewRequest,
} from "./contract.ts";

describe("resolveReportViewRequest", () => {
  test("accepts a bare receipt number and applies defaults", () => {
    expect(resolveReportViewRequest({ receipt: "20260331004166" })).toEqual({
      receipt: "20260331004166",
      documentId: undefined,
      sectionId: undefined,
      outputFormat: "html",
      maxBytes: 200000,
    });
  });

  test("accepts a DART viewer URL with rcpNo", () => {
    expect(
      resolveReportViewRequest({
        receipt:
          "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
        sectionId: "section:1.2",
        maxBytes: 50000,
      }),
    ).toMatchObject({
      receipt:
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
      sectionId: "section:1.2",
      outputFormat: "html",
      maxBytes: 50000,
    });
  });

  test("rejects unknown fields before provider execution", () => {
    expect(() =>
      resolveReportViewRequest({
        receipt: "20260331004166",
        dcmNo: "11213016",
      }),
    ).toThrow(InvalidReportViewRequest);
  });

  test("rejects values without a valid receipt number", () => {
    try {
      resolveReportViewRequest({ receipt: "not-a-receipt" });
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidReportViewRequest);
      if (!(error instanceof InvalidReportViewRequest)) throw error;
      expect(error.parameter).toBe("receipt");
      expect(error.message).toContain("rcpNo");
    }
  });
});
