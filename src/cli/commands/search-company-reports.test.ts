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
      "--include-all-reports",
    ]);

    expect(options).toEqual({
      companyCode: "00190321",
      startDate: "20250507",
      endDate: "20260507",
      page: 2,
      pageSize: 30,
      sortDirection: "asc",
      includeAllReports: true,
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseSearchCompanyReportsCommandArgs([])).toEqual({});
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
    expect(searchCompanyReportsUsage).toContain("--include-all-reports");
    expect(searchCompanyReportsUsage).toContain("최종보고서 필터");
    expect(searchCompanyReportsUsage).toContain("정정 전 보고서까지 포함");
    expect(searchCompanyReportsUsage).not.toContain("--sort-by");
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
      ]) as Record<string, unknown>,
    );

    expect(request).toEqual({
      companyCode: "00190321",
      startDate: "20250507",
      endDate: "20260507",
      page: 1,
      pageSize: 15,
      sortDirection: "desc",
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
        companyCode: "00190321",
        startDate: "20250507",
        endDate: "20260507",
        includeAllReports: true,
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
      companyCode: "00190321",
      startDate: "20250507",
      endDate: "20260507",
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

  test("rejects invalid capability input before execution", async () => {
    try {
      await executeSearchCompanyReportsCommand(
        {
          startDate: "20250507",
          endDate: "20260507",
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
