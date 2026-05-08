import { describe, expect, test } from "bun:test";

import {
  SearchCompanyReportsFailure,
  resolveSearchCompanyReportsRequest,
} from "../../capabilities/search-company-reports/contract.ts";
import { executeSearchCompanyReports } from "../../capabilities/search-company-reports/execute.ts";
import {
  createSearchCompanyReportsCommandWithRunner,
  executeSearchCompanyReportsCommand,
  parseSearchCompanyReportsCommandArgs,
  renderSearchCompanyReportsCliErrorMessage,
  searchCompanyReportsUsage,
} from "./search-company-reports.ts";

describe("parseSearchCompanyReportsCommandArgs", () => {
  test("parses semantic flags into public capability keys", () => {
    const options = parseSearchCompanyReportsCommandArgs([
      "--company-code",
      "00190321",
      "--start-date",
      "20250507",
      "--end-date",
      "20260507",
      "--page",
      "2",
      "--page-size",
      "30",
      "--sort-direction",
      "asc",
      "--presenter-name",
      "케이티",
      "--report-name",
      "사업보고서",
      "--disclosure-type",
      "A001",
      "--disclosure-type",
      "I001",
      "--industry-code",
      "612",
      "--corporation-type",
      "P",
      "--closing-accounts-month",
      "12",
      "--include-all-reports",
      "--verbose",
    ]);

    expect(options).toEqual({
      request: {
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
      },
      output: { pretty: false, verbose: true },
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseSearchCompanyReportsCommandArgs([])).toEqual({
      request: {},
      output: { pretty: false, verbose: false },
    });
  });

  test("rejects invalid integer options early", () => {
    expect(() =>
      parseSearchCompanyReportsCommandArgs([
        "--company-code",
        "00190321",
        "--page-size",
        "nope",
      ]),
    ).toThrow(
      "option '--page-size <number>' argument 'nope' is invalid. 정수를 입력해야 하지만 \"nope\"을(를) 받았습니다.",
    );
  });

  test("documents the explicit CLI surface locally", () => {
    expect(searchCompanyReportsUsage).toContain("--company-code <text>");
    expect(searchCompanyReportsUsage).toContain("--start-date <YYYYMMDD>");
    expect(searchCompanyReportsUsage).toContain("--end-date <YYYYMMDD>");
    expect(searchCompanyReportsUsage).toContain("--page-size <number>");
    expect(searchCompanyReportsUsage).toContain("--sort-direction <asc|desc>");
    expect(searchCompanyReportsUsage).toContain("--presenter-name <text>");
    expect(searchCompanyReportsUsage).toContain("--report-name <text>");
    expect(searchCompanyReportsUsage).toContain("--disclosure-type <code>");
    expect(searchCompanyReportsUsage).toContain("--industry-code <code>");
    expect(searchCompanyReportsUsage).toContain("--corporation-type <all|P|A|N|E>");
    expect(searchCompanyReportsUsage).toContain("--closing-accounts-month <all|01-12>");
    expect(searchCompanyReportsUsage).toContain("--include-all-reports");
    expect(searchCompanyReportsUsage).toContain("--pretty");
    expect(searchCompanyReportsUsage).toContain("--verbose");
    expect(searchCompanyReportsUsage).toContain("최종보고서 필터");
    expect(searchCompanyReportsUsage).toContain("정정 전 보고서까지 포함");
    expect(searchCompanyReportsUsage).not.toContain("--sort-by");
    expect(searchCompanyReportsUsage).not.toContain("--include-evidence");
    expect(searchCompanyReportsUsage).toContain(
      "search-company --company-name <회사명>",
    );
  });

  test("resolves parsed options through the shared capability resolver", () => {
    const request = resolveSearchCompanyReportsRequest(
      parseSearchCompanyReportsCommandArgs([
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
      ]).request,
    );

    expect(request).toEqual({
      companyCode: "00190321",
      startDate: "20250507",
      endDate: "20260507",
      page: 1,
      pageSize: 15,
      sortDirection: "desc",
      disclosureTypes: [],
      industryCode: "all",
      corporationType: "all",
      closingAccountsMonth: "all",
      includeAllReports: false,
    });
  });

  test("passes --include-all-reports as a public include-all request field", async () => {
    let receivedInput: Record<string, unknown> | undefined;
    const result = {
      result: {
        request: {
          companyCode: "00190321",
          startDate: "20250507",
          endDate: "20260507",
          page: 1,
          pageSize: 15,
          sortDirection: "desc",
          disclosureTypes: [],
          industryCode: "all",
          corporationType: "all",
          closingAccountsMonth: "all",
          includeAllReports: true,
        },
        company: { companyCode: "00190321" },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          returnedCount: 0,
        },
        items: [],
      },
      metadata: {
        fetchedAt: "2026-05-07T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsab007",
          endpoint: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
        },
        sourceBehavior: {
          searchMode: "corp",
          sortBy: "date",
          callerControlsPageSize: true,
          pageSizeChoices: [15, 30, 50, 100],
          finalReportDefault: true,
          observationStatus: "observed",
        },
        completeness: "complete",
        droppedItemCount: 0,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
      },
      warnings: [],
    } as const;

    await executeSearchCompanyReportsCommand(
      {
        request: {
          companyCode: "00190321",
          startDate: "20250507",
          endDate: "20260507",
          includeAllReports: true,
        },
        output: { pretty: false, verbose: false },
      },
      {
        runOperation: async (input) => {
          receivedInput = input;
          return result;
        },
        writeStdout: () => undefined,
      },
    );

    expect(receivedInput).toEqual({
      companyCode: "00190321",
      startDate: "20250507",
      endDate: "20260507",
      includeAllReports: true,
    });
  });

  test("passes parsed semantic options to the command runner", async () => {
    let received: ReturnType<typeof parseSearchCompanyReportsCommandArgs> | undefined;

    const command = createSearchCompanyReportsCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "search-company-reports",
        "--company-code",
        "00190321",
        "--start-date",
        "20250507",
        "--end-date",
        "20260507",
      ],
      { from: "node" },
    );

    expect(received).toEqual({
      request: {
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
      },
      output: { pretty: false, verbose: false },
    });
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new SearchCompanyReportsFailure({
      code: "invalid_request",
      message:
        '필수 매개변수 "companyCode"이(가) 없습니다. 필요한 값: [필수] DART 회사 코드(8자리 숫자)입니다.',
      parameter: "companyCode",
      retryable: false,
    });

    expect(renderSearchCompanyReportsCliErrorMessage(error)).toBe(
      '필수 옵션 "--company-code"이(가) 없습니다. 필요한 값: [필수] DART 회사 코드(8자리 숫자)입니다.',
    );
  });

  test("prints a compact JSON payload with the capability result", async () => {
    const result = {
      result: {
        request: {
          companyCode: "00190321",
          startDate: "20250507",
          endDate: "20260507",
          page: 1,
          pageSize: 15,
          sortDirection: "desc",
          disclosureTypes: [],
          industryCode: "all",
          corporationType: "all",
          closingAccountsMonth: "all",
          includeAllReports: false,
        },
        company: { companyCode: "00190321" },
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          returnedCount: 1,
        },
        items: [
          {
            company: { companyCode: "00190321", name: "유 케이티" },
            filing: {
              receiptNumber: "20260331004166",
              reportTitle: "사업보고서",
              receiptDate: "20260331",
            },
            references: {
              viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
            },
            remarks: [],
            evidence: {
              rawRowText: "유 케이티 사업보고서 20260331",
            },
          },
        ],
      },
      metadata: {
        fetchedAt: "2026-05-07T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsab007",
          endpoint: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
        },
        sourceBehavior: {
          searchMode: "corp",
          sortBy: "date",
          callerControlsPageSize: true,
          pageSizeChoices: [15, 30, 50, 100],
          finalReportDefault: true,
          observationStatus: "observed",
        },
        completeness: "complete",
        droppedItemCount: 0,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsab007/detailSearch.ax",
      },
      warnings: [],
    } as const;
    const writes: string[] = [];

    await executeSearchCompanyReportsCommand(
      {
        request: {
          companyCode: "00190321",
          startDate: "20250507",
          endDate: "20260507",
        },
        output: { pretty: false, verbose: false },
      },
      {
        runOperation: async (input) => {
          expect(input).toEqual({
            companyCode: "00190321",
            startDate: "20250507",
            endDate: "20260507",
          });
          return result;
        },
        writeStdout: (text) => writes.push(text),
      },
    );

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]!).result.request).toEqual(result.result.request);
  });

  test("rejects invalid capability input before execution", async () => {
    try {
      await executeSearchCompanyReportsCommand(
        {
          request: {
            startDate: "20250507",
            endDate: "20260507",
          },
          output: { pretty: false, verbose: false },
        },
        {
          runOperation: (input) =>
            executeSearchCompanyReports(input, {
              search: async () => {
                throw new Error("Provider should not be called.");
              },
            }),
          writeStdout: () => undefined,
        },
      );
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(SearchCompanyReportsFailure);

      if (!(error instanceof SearchCompanyReportsFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("companyCode");
    }
  });
});
