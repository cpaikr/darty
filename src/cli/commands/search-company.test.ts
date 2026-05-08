import { describe, expect, test } from "bun:test";

import {
  SearchCompanyFailure,
  resolveSearchCompanyRequest,
} from "../../capabilities/search-company/contract.ts";
import { executeSearchCompany } from "../../capabilities/search-company/execute.ts";
import {
  createSearchCompanyCommandWithRunner,
  executeSearchCompanyCommand,
  parseSearchCompanyCommandArgs,
  renderSearchCompanyCliErrorMessage,
  searchCompanyUsage,
} from "./search-company.ts";

describe("parseSearchCompanyCommandArgs", () => {
  test("parses semantic flags into public capability keys", () => {
    const options = parseSearchCompanyCommandArgs([
      "--company-name",
      "삼성전자",
      "--page",
      "2",
      "--page-size",
      "20",
    ]);

    expect(options).toEqual({
      request: {
        companyName: "삼성전자",
        page: 2,
        pageSize: 20,
      },
      output: { pretty: false, verbose: false },
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseSearchCompanyCommandArgs([])).toEqual({
      request: {},
      output: { pretty: false, verbose: false },
    });
  });

  test("rejects invalid integer options early", () => {
    expect(() =>
      parseSearchCompanyCommandArgs([
        "--company-name",
        "삼성전자",
        "--page-size",
        "nope",
      ]),
    ).toThrow(
      "option '--page-size <number>' argument 'nope' is invalid. 정수를 입력해야 하지만 \"nope\"을(를) 받았습니다.",
    );
  });

  test("documents the explicit CLI surface locally", () => {
    expect(searchCompanyUsage).toContain("--company-name <text>");
    expect(searchCompanyUsage).toContain("--page <number>");
    expect(searchCompanyUsage).toContain("--page-size <number>");
    expect(searchCompanyUsage).toContain("DART 회사 고유코드(8자리)");
    expect(searchCompanyUsage).toContain("companyCode");
    expect(searchCompanyUsage).toContain("--pretty");
    expect(searchCompanyUsage).toContain("--verbose");
    expect(searchCompanyUsage).not.toContain("--include-evidence");
    expect(searchCompanyUsage).not.toContain("업종별");
  });

  test("resolves parsed options through the shared capability resolver", () => {
    const request = resolveSearchCompanyRequest(
      parseSearchCompanyCommandArgs(["--company-name", "삼성전자"]).request,
    );

    expect(request).toEqual({
      page: 1,
      pageSize: 15,
      companyName: "삼성전자",
    });
  });

  test("passes parsed semantic options to the command runner", async () => {
    let received: ReturnType<typeof parseSearchCompanyCommandArgs> | undefined;

    const command = createSearchCompanyCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "search-company",
        "--company-name",
        "삼성전자",
        "--page",
        "2",
      ],
      { from: "node" },
    );

    expect(received).toEqual({
      request: {
        companyName: "삼성전자",
        page: 2,
      },
      output: { pretty: false, verbose: false },
    });
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new SearchCompanyFailure({
      code: "invalid_request",
      message:
        '필수 매개변수 "companyName"이(가) 없습니다. 필요한 값: 2자 이상의 문자열.',
      parameter: "companyName",
      retryable: false,
    });

    expect(renderSearchCompanyCliErrorMessage(error)).toBe(
      '필수 옵션 "--company-name"이(가) 없습니다. 필요한 값: 2자 이상의 문자열.',
    );
  });

  test("rejects invalid capability input before execution", async () => {
    try {
      await executeSearchCompanyCommand(
        {
          request: {},
          output: { pretty: false, verbose: false },
        },
        {
          runOperation: (input) =>
            executeSearchCompany(input, {
              search: async () => {
                throw new Error("Provider should not be called.");
              },
            }),
          writeStdout: () => undefined,
        },
      );
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(SearchCompanyFailure);

      if (!(error instanceof SearchCompanyFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("companyName");
    }
  });

  test("prints a compact JSON payload without evidence by default", async () => {
    const writes: string[] = [];
    let receivedInput: Record<string, unknown> | undefined;

    const result = {
      result: {
        request: {
          page: 1,
          pageSize: 45,
          companyName: "삼성전자",
        },
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          returnedCount: 1,
        },
        items: [
          {
            companyCode: "00126380",
            companyName: "삼성전자",
            stockCode: "005930",
            marketKind: "kospi",
            marketLabel: "유가증권시장",
            references: {
              detailEndpoint:
                "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380",
            },
            evidence: {
              rawCompanyLinkHref: "javascript:select('00126380');",
              rawMarketBadgeText: "유",
            },
          },
        ],
      },
      metadata: {
        fetchedAt: "2026-05-07T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsae001",
          endpoint: "https://dart.fss.or.kr/dsae001/search.ax",
        },
        sourceBehavior: {
          searchMode: "company",
          callerControlsPageSize: true,
          maxObservedPageSize: 45,
          observationStatus: "observed",
        },
        completeness: "complete",
        droppedItemCount: 0,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsae001/search.ax",
      },
      warnings: [],
    } as const;

    const command = createSearchCompanyCommandWithRunner((options) =>
      executeSearchCompanyCommand(options, {
        runOperation: async (input) => {
          receivedInput = input;
          return result;
        },
        writeStdout: (text) => {
          writes.push(text);
        },
      }),
    );

    await command.parseAsync(
      ["node", "search-company", "--company-name", "삼성전자"],
      { from: "node" },
    );

    expect(receivedInput).toEqual({ companyName: "삼성전자" });
    expect(writes).toEqual([
      JSON.stringify({
        ...result,
        result: {
          ...result.result,
          items: [
            {
              companyCode: "00126380",
              companyName: "삼성전자",
              stockCode: "005930",
              marketKind: "kospi",
              marketLabel: "유가증권시장",
              references: {
                detailEndpoint:
                  "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380",
              },
            },
          ],
        },
      }),
    ]);
  });

  test("prints full evidence fields in verbose output", async () => {
    const writes: string[] = [];
    const result = {
      result: {
        request: {
          page: 1,
          pageSize: 15,
          companyName: "삼성전자",
        },
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          returnedCount: 1,
        },
        items: [
          {
            companyCode: "00126380",
            companyName: "삼성전자",
            marketKind: "kospi",
            references: {
              detailEndpoint:
                "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380",
            },
            evidence: {
              rawCompanyLinkHref: "javascript:select('00126380');",
            },
          },
        ],
      },
      metadata: {
        fetchedAt: "2026-05-07T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsae001",
          endpoint: "https://dart.fss.or.kr/dsae001/search.ax",
        },
        sourceBehavior: {
          searchMode: "company",
          callerControlsPageSize: true,
          maxObservedPageSize: 45,
          observationStatus: "observed",
        },
        completeness: "complete",
        droppedItemCount: 0,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsae001/search.ax",
      },
      warnings: [],
    } as const;

    await executeSearchCompanyCommand(
      {
        request: { companyName: "삼성전자" },
        output: { pretty: false, verbose: true },
      },
      {
        runOperation: async (input) => {
          expect(input).toEqual({ companyName: "삼성전자" });
          return result;
        },
        writeStdout: (text) => {
          writes.push(text);
        },
      },
    );

    expect(writes).toEqual([JSON.stringify(result)]);
  });
});
