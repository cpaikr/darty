import { describe, expect, test } from "bun:test";

import {
  InvalidViewReportRequest,
  resolveViewReportRequest,
} from "./contract.ts";

describe("resolveViewReportRequest", () => {
  test("accepts a bare receipt number and applies defaults", () => {
    expect(resolveViewReportRequest({ receipt: "20260331004166" })).toEqual({
      receipt: "20260331004166",
      outputFormat: "markdown",
      maxBytes: 50000,
      contentStartByte: 0,
    });
  });

  test("accepts markdown output", () => {
    expect(
      resolveViewReportRequest({
        receipt: "20260331004166",
        outputFormat: "markdown",
      }),
    ).toMatchObject({
      outputFormat: "markdown",
    });
  });

  test("accepts an explicit rendered-content byte window", () => {
    expect(
      resolveViewReportRequest({
        receipt: "20260331004166",
        contentStartByte: 25000,
      }),
    ).toMatchObject({
      contentStartByte: 25000,
    });
  });

  test("accepts a DART viewer URL with rcpNo", () => {
    expect(
      resolveViewReportRequest({
        receipt:
          "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
        sectionId: "section:1.2",
        maxBytes: 50000,
      }),
    ).toMatchObject({
      receipt:
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
      sectionId: "section:1.2",
      outputFormat: "markdown",
      maxBytes: 50000,
      contentStartByte: 0,
    });
  });

  test("rejects negative content window starts", () => {
    expect(() =>
      resolveViewReportRequest({
        receipt: "20260331004166",
        contentStartByte: -1,
      }),
    ).toThrow(InvalidViewReportRequest);
  });

  test("rejects unknown fields before provider execution", () => {
    expect(() =>
      resolveViewReportRequest({
        receipt: "20260331004166",
        dcmNo: "11213016",
      }),
    ).toThrow(InvalidViewReportRequest);
  });

  test("rejects values without a valid receipt number", () => {
    try {
      resolveViewReportRequest({ receipt: "not-a-receipt" });
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidViewReportRequest);
      if (!(error instanceof InvalidViewReportRequest)) throw error;
      expect(error.parameter).toBe("receipt");
      expect(error.message).toContain("rcpNo");
    }
  });
});
