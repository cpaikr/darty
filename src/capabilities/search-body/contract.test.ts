import { describe, expect, test } from "bun:test";

import {
  InvalidSearchBodyRequest,
  resolveSearchBodyRequest,
} from "./contract.ts";

describe("resolveSearchBodyRequest", () => {
  test("applies defaults to the public semantic request", () => {
    expect(
      resolveSearchBodyRequest({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
      }),
    ).toEqual({
      page: 1,
      sortBy: "date",
      sortDirection: "desc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: undefined,
      presenterName: undefined,
      reportName: undefined,
    });
  });

  test("rejects missing required parameters with structured data", () => {
    try {
      resolveSearchBodyRequest({
        startDate: "20250331",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("missing_parameter");
      expect(error.parameter).toBe("keyword");
      expect(error.reason).toBe("required");
      expect(error.expected).toBe("non_empty_string");
    }
  });

  test("rejects invalid date formats with structured data", () => {
    try {
      resolveSearchBodyRequest({
        keyword: "배당",
        startDate: "2025-03-31",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("startDate");
      expect(error.reason).toBe("invalid_format");
      expect(error.expected).toBe("date_YYYYMMDD");
      expect(error.actual).toBe("2025-03-31");
    }
  });

  test("rejects invalid company code formats with structured data", () => {
    try {
      resolveSearchBodyRequest({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: "005930",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("companyCode");
      expect(error.reason).toBe("invalid_format");
      expect(error.expected).toBe("8_digit_company_code");
      expect(error.actual).toBe("005930");
      expect(error.message).toContain("8자리 DART 회사 코드");
      expect(error.message).toContain("6자리 종목코드");
    }
  });

  test("rejects impossible calendar dates with structured data", () => {
    try {
      resolveSearchBodyRequest({
        keyword: "배당",
        startDate: "20250230",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("startDate");
      expect(error.reason).toBe("invalid_calendar_date");
      expect(error.expected).toBe("date_YYYYMMDD");
      expect(error.actual).toBe("20250230");
      expect(error.message).toContain("실제 날짜");
    }
  });

  test("rejects date ranges where the start date is after the end date", () => {
    try {
      resolveSearchBodyRequest({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20250101",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("startDate");
      expect(error.reason).toBe("start_date_after_end_date");
      expect(error.expected).toBe("date_range_start_lte_end");
      expect(error.actual).toEqual({
        startDate: "20250331",
        endDate: "20250101",
      });
      expect(error.message).toBe(
        "검색 시작일은 종료일보다 늦을 수 없습니다. startDate=20250331, endDate=20250101.",
      );
    }
  });

  test("rejects removed or unknown public parameters", () => {
    try {
      resolveSearchBodyRequest({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        limit: 25,
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("unknown_parameter");
      expect(error.parameter).toBe("limit");
    }
  });

  test("chooses a deterministic first parameter when multiple fields are invalid", () => {
    try {
      resolveSearchBodyRequest({
        page: 0,
        keyword: "",
        startDate: "2025-03-31",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("page");
      expect(error.reason).toBe("out_of_range");
      expect(error.expected).toBe("integer_between_1_and_100");
      expect(error.actual).toBe(0);
    }
  });

  test("rejects non-object raw input with a structured root-level error", () => {
    try {
      resolveSearchBodyRequest("배당" as unknown as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchBodyRequest);

      if (!(error instanceof InvalidSearchBodyRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("input");
      expect(error.reason).toBe("invalid_type");
      expect(error.expected).toBe("search_body_parameters_object");
      expect(error.actual).toBe("배당");
    }
  });
});
