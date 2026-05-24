import { describe, expect, test } from "bun:test";

import {
  InvalidSearchCompanyReportsRequest,
  resolveSearchCompanyReportsRequest,
} from "./contract.ts";

describe("resolveSearchCompanyReportsRequest", () => {
  test("applies defaults to the public semantic request", () => {
    expect(
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
      }),
    ).toEqual({
      companyCode: "00190321",
      startDate: "20250507",
      endDate: "20260507",
      page: 1,
      pageSize: 15,
      sortDirection: "desc",
      detail: "concise",
      disclosureTypes: [],
      industryCode: "all",
      corporationType: "all",
      closingAccountsMonth: "all",
      includeAllReports: false,
    });
  });

  test("accepts explicit paging, filters, sort direction, and include-all setting", () => {
    expect(
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        page: 2,
        pageSize: 30,
        sortDirection: "asc",
        presenterName: "케이티",
        reportName: "사업보고서",
        disclosureTypes: ["A001", "I001"],
        industryCode: "612",
        corporationType: "P",
        closingAccountsMonth: "12",
        includeAllReports: true,
      }),
    ).toMatchObject({
      page: 2,
      pageSize: 30,
      sortDirection: "asc",
      presenterName: "케이티",
      reportName: "사업보고서",
      disclosureTypes: ["A001", "I001"],
      industryCode: "612",
      corporationType: "P",
      closingAccountsMonth: "12",
      includeAllReports: true,
    });
  });

  test("rejects missing required parameters with structured data", () => {
    try {
      resolveSearchCompanyReportsRequest({
        startDate: "20250507",
        endDate: "20260507",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.code).toBe("missing_parameter");
      expect(error.parameter).toBe("companyCode");
      expect(error.reason).toBe("required");
    }
  });

  test("rejects stock codes as company codes", () => {
    try {
      resolveSearchCompanyReportsRequest({
        companyCode: "030200",
        startDate: "20250507",
        endDate: "20260507",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.code).toBe("invalid_parameter");
      expect(error.parameter).toBe("companyCode");
      expect(error.reason).toBe("invalid_format");
      expect(error.expected).toBe("8_digit_company_code");
      expect(error.message).toContain("8자리 DART 회사 코드");
      expect(error.message).toContain("6자리 종목코드");
    }
  });

  test("trims text filters and rejects empty text filters", () => {
    expect(
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        presenterName: " 케이티 ",
      }),
    ).toMatchObject({ presenterName: "케이티" });

    try {
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        reportName: " ",
      });
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.parameter).toBe("reportName");
      expect(error.reason).toBe("empty_string");
      expect(error.expected).toBe("non_empty_string");
    }
  });

  test("rejects unsupported disclosure type codes", () => {
    try {
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        disclosureTypes: ["사업보고서"],
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.parameter).toBe("disclosureTypes");
      expect(error.reason).toBe("invalid_format");
      expect(error.expected).toBe("array_of_disclosure_type_codes");
      expect(error.message).toContain("A001");
      expect(error.message).toContain("reportName");
    }

    try {
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        disclosureTypes: ["A999"],
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.parameter).toBe("disclosureTypes");
      expect(error.reason).toBe("unknown_code");
      expect(error.expected).toBe("known_disclosure_type_code");
      expect(error.actual).toEqual(["A999"]);
      expect(error.message).toContain("알려지지 않은");
      expect(error.message).toContain("darty_list_disclosure_types");
      expect(error.message).toContain("darty disclosure-types --query");
      expect(error.message).toContain("reportName");
    }
  });

  test("gives actionable hints for invalid DART code filters", () => {
    expect(() =>
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        industryCode: "전기 통신업",
      } as Record<string, unknown>),
    ).toThrow("612=전기 통신업");

    expect(() =>
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        corporationType: "KOSPI",
      } as Record<string, unknown>),
    ).toThrow("P(유가증권시장)");

    expect(() =>
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        closingAccountsMonth: "1",
      } as Record<string, unknown>),
    ).toThrow('"01"');
  });

  test("normalizes compact agent page sizes to the smallest DART page size", () => {
    expect(
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        pageSize: 5,
      }),
    ).toMatchObject({ pageSize: 15 });

    expect(
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        pageSize: 10,
      }),
    ).toMatchObject({ pageSize: 15 });
  });

  test("rejects unsupported page sizes", () => {
    try {
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        pageSize: 20,
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.parameter).toBe("pageSize");
      expect(error.reason).toBe("invalid_choice");
      expect(error.expected).toBe("one_of:5,10,15,30,50,100");
    }
  });

  test("rejects impossible dates and reversed ranges", () => {
    expect(() =>
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250230",
        endDate: "20260507",
      }),
    ).toThrow("실제 날짜");

    expect(() =>
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20260507",
        endDate: "20250507",
      }),
    ).toThrow("검색 시작일은 종료일보다 늦을 수 없습니다");
  });

  test("rejects unknown public parameters", () => {
    try {
      resolveSearchCompanyReportsRequest({
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        sortBy: "reportName",
      } as Record<string, unknown>);
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSearchCompanyReportsRequest);

      if (!(error instanceof InvalidSearchCompanyReportsRequest)) {
        throw error;
      }

      expect(error.code).toBe("unknown_parameter");
      expect(error.parameter).toBe("sortBy");
    }
  });
});
