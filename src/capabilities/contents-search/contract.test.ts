import { describe, expect, test } from "bun:test";

import {
  InvalidContentsSearchRequest,
  resolveContentsSearchRequest,
} from "./contract.ts";

describe("resolveContentsSearchRequest", () => {
  test("applies defaults to the public semantic request", () => {
    expect(
      resolveContentsSearchRequest({
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
      resolveContentsSearchRequest({
        startDate: "20250331",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchRequest);

      if (!(error instanceof InvalidContentsSearchRequest)) {
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
      resolveContentsSearchRequest({
        keyword: "배당",
        startDate: "2025-03-31",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchRequest);

      if (!(error instanceof InvalidContentsSearchRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("startDate");
      expect(error.reason).toBe("invalid_format");
      expect(error.expected).toBe("date_YYYYMMDD");
      expect(error.actual).toBe("2025-03-31");
    }
  });

  test("rejects removed or unknown public parameters", () => {
    try {
      resolveContentsSearchRequest({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        limit: 25,
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchRequest);

      if (!(error instanceof InvalidContentsSearchRequest)) {
        throw error;
      }

      expect(error.code).toBe("unknown_parameter");
      expect(error.parameter).toBe("limit");
    }
  });

  test("chooses a deterministic first parameter when multiple fields are invalid", () => {
    try {
      resolveContentsSearchRequest({
        page: 0,
        keyword: "",
        startDate: "2025-03-31",
        endDate: "20260331",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchRequest);

      if (!(error instanceof InvalidContentsSearchRequest)) {
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
      resolveContentsSearchRequest("배당" as unknown as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchRequest);

      if (!(error instanceof InvalidContentsSearchRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("input");
      expect(error.reason).toBe("invalid_type");
      expect(error.expected).toBe("contents_search_parameters_object");
      expect(error.actual).toBe("배당");
    }
  });
});
