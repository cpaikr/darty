import { describe, expect, test } from "bun:test";

import {
  SearchBodyFailure,
  resolveSearchBodyRequest,
} from "../../capabilities/search-body/contract.ts";
import { executeSearchBody } from "../../capabilities/search-body/execute.ts";
import {
  createSearchBodyCommandWithRunner,
  searchBodyUsage,
  executeSearchBodyCommand,
  parseSearchBodyCommandArgs,
  renderSearchBodyCliErrorMessage,
} from "./search-body.ts";

describe("parseSearchBodyCommandArgs", () => {
  test("parses semantic flags into public capability keys", () => {
    const options = parseSearchBodyCommandArgs([
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--company-code",
      "01368637",
      "--presenter-name",
      "IR",
      "--page",
      "2",
      "--sort-by",
      "reportName",
      "--sort-direction",
      "asc",
      "--report-name",
      "정기주주총회결과",
      "--verbose",
      "--agent",
    ]);

    expect(options).toEqual({
      request: {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: "01368637",
        presenterName: "IR",
        page: 2,
        sortBy: "reportName",
        sortDirection: "asc",
        detail: "raw",
        reportName: "정기주주총회결과",
      },
      output: { pretty: false, verbose: true, agent: true },
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseSearchBodyCommandArgs([])).toEqual({
      request: {},
      output: { pretty: false, verbose: false, agent: false },
    });
  });

  test("rejects invalid integer options early", () => {
    expect(() =>
      parseSearchBodyCommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--page",
        "nope",
      ]),
    ).toThrow('Expected an integer but received "nope"');
  });

  test("documents the explicit CLI surface locally", () => {
    expect(searchBodyUsage).toContain("--page <number>");
    expect(searchBodyUsage).toContain("--sort-by <date|reportName>");
    expect(searchBodyUsage).toContain("--sort-direction <asc|desc>");
    expect(searchBodyUsage).toContain("--keyword <text>");
    expect(searchBodyUsage).toContain("--start-date <YYYYMMDD>");
    expect(searchBodyUsage).toContain("--end-date <YYYYMMDD>");
    expect(searchBodyUsage).toContain("--company-code <text>");
    expect(searchBodyUsage).toContain("--presenter-name <text>");
    expect(searchBodyUsage).toContain("--report-name <text>");
    expect(searchBodyUsage).toContain("--pretty");
    expect(searchBodyUsage).toContain("--verbose");
    expect(searchBodyUsage).toContain("--agent");
    expect(searchBodyUsage).toContain("Source evidence");
    expect(searchBodyUsage).toContain("raw DART row text or snippet HTML");
    expect(searchBodyUsage).toContain("Use --verbose with the CLI to see");
    expect(searchBodyUsage).toContain("If");
    expect(searchBodyUsage).toContain("--detail is omitted, request detail=raw.");
    expect(searchBodyUsage).toContain("Display command help.");
    expect(searchBodyUsage).not.toContain("--include-evidence");
    expect(searchBodyUsage).not.toContain("display help for command");
  });

  test("renders CLI-owned descriptions, notes, and examples in usage", () => {
    expect(searchBodyUsage).toContain(
      "Search submitted filing text through DART 공시통합검색 `본문내용` mode.",
    );
    expect(searchBodyUsage).toContain("DART shared search syntax");
    expect(searchBodyUsage).toContain("`사과|포도`=OR");
    expect(searchBodyUsage).toContain(
      "8-digit DART company code. Free-text company",
    );
    expect(searchBodyUsage).not.toContain("사과포도");
    expect(searchBodyUsage).not.toContain(
      "`전체`, `회사명`, `보고서명`, `보고서 목차명`, `고급검색` 모드는 아직 공개 도구가 아닙니다.",
    );
    expect(searchBodyUsage).not.toContain(
      "동의어, 문서유형(본문/첨부문서), 공시유형, 페이지 크기",
    );
    expect(searchBodyUsage).not.toContain("[확인됨]");
    expect(searchBodyUsage).not.toContain("참고:");
    expect(searchBodyUsage).toContain("Search tips:");
    expect(searchBodyUsage).toContain(
      "본문내용 search is document-level keyword search.",
    );
    expect(searchBodyUsage).toContain(
      "not necessarily in the same paragraph, table, or item.",
    );
    expect(searchBodyUsage).toContain(
      "pass a result viewerUrl or receipt number to view-report",
    );
    expect(searchBodyUsage).toContain(
      "source evidence such as raw DART row text or snippet HTML",
    );
    expect(searchBodyUsage).toContain(
      "raw adds row-level evidence fields, not the full DART search HTML.",
    );
    expect(searchBodyUsage).toContain(
      "darty search-body --keyword 배당 --start-date 20250331 --end-date 20260331",
    );
    expect(searchBodyUsage).not.toContain("--limit");
    expect(searchBodyUsage).not.toContain("--company-name");
    expect(searchBodyUsage).not.toContain("text-crp-nm");
  });

  test("resolves parsed options through the shared capability resolver", () => {
    const request = resolveSearchBodyRequest(
      parseSearchBodyCommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ]).request,
    );

    expect(request).toEqual({
      page: 1,
      sortBy: "date",
      sortDirection: "desc",
      detail: "concise",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
    });
  });

  test("passes parsed semantic options to the command runner", async () => {
    let received:
      | ReturnType<typeof parseSearchBodyCommandArgs>
      | undefined;

    const command = createSearchBodyCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "search-body",
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--company-code",
        "01368637",
        "--page",
        "2",
        "--sort-direction",
        "asc",
      ],
      { from: "node" },
    );

    expect(received).toEqual({
      request: {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: "01368637",
        page: 2,
        sortDirection: "asc",
      },
      output: { pretty: false, verbose: false, agent: false },
    });
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new SearchBodyFailure({
      code: "invalid_request",
      message:
        'Missing required parameter "startDate". Expected date string in YYYYMMDD format.',
      parameter: "startDate",
      retryable: false,
    });

    expect(renderSearchBodyCliErrorMessage(error)).toBe(
      'Missing required option "--start-date". Expected date string in YYYYMMDD format.',
    );
  });

  test("rejects invalid capability input before execution", async () => {
    try {
      await executeSearchBodyCommand(
        {
          request: {
            startDate: "20250331",
            endDate: "20260331",
          },
          output: { pretty: false, verbose: false, agent: false },
        },
        {
          runOperation: (input) =>
            executeSearchBody(input, {
              search: async () => {
                throw new Error("Provider should not be called for invalid input.");
              },
            }),
          writeStdout: () => undefined,
        },
      );
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(SearchBodyFailure);

      if (!(error instanceof SearchBodyFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("keyword");
      expect(error.message).toBe(
        'Missing required parameter "keyword". Expected non-empty string.',
      );
    }
  });

  test("prints a compact JSON payload with the capability result", async () => {
    const writes: string[] = [];
    let receivedInput:
      | Record<string, unknown>
      | undefined;

    const result = {
      result: {
        request: {
          page: 2,
          sortBy: "date",
          sortDirection: "desc",
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
          companyCode: undefined,
          presenterName: undefined,
          reportName: undefined,
        },
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalCount: 21,
          returnedCount: 10,
        },
        items: [
          {
            company: {
              name: "삼성전자",
              companyCode: "00126380",
            },
            filing: {
              receiptNumber: "20260331004166",
              reportTitle: "사업보고서",
              receiptDate: "20260331",
            },
            match: {
              snippetText: "배당 관련 내용",
            },
            references: {
              viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
            },
            evidence: {
              reportNameRaw: "사업보고서",
              rawInfoText: "[정기공시] 본문 제출인 : 삼성전자",
              snippetHtml: "<span>배당</span> 관련 내용",
            },
          },
        ],
      },
      metadata: {
        fetchedAt: "2026-03-31T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsab007",
          endpoint: "https://dart.fss.or.kr/dsab007/search.ax",
        },
        sourceBehavior: {
          effectivePageSize: 10,
          effectivePagerWidth: 10,
          callerControlsPageSize: false,
          callerControlsPagerWidth: false,
          observationStatus: "observed",
        },
        completeness: "complete",
        droppedItemCount: 0,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
      },
      warnings: [],
    } as const;

    const command = createSearchBodyCommandWithRunner((options) =>
      executeSearchBodyCommand(options, {
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
      [
        "node",
        "search-body",
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--page",
        "2",
      ],
      { from: "node" },
    );

    expect(receivedInput).toEqual({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      page: 2,
    });
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]!).result.request).toEqual(result.result.request);
  });
});
