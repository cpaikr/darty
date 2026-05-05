import { describe, expect, test } from "bun:test";

import {
  ContentsSearchFailure,
  resolveContentsSearchRequest,
} from "../../capabilities/contents-search/contract.ts";
import { executeContentsSearch } from "../../capabilities/contents-search/execute.ts";
import {
  createContentsSearchCommandWithRunner,
  contentsSearchUsage,
  executeContentsSearchCommand,
  parseContentsSearchCommandArgs,
} from "./contents-search.ts";

describe("parseContentsSearchCommandArgs", () => {
  test("parses semantic flags into public capability keys", () => {
    const options = parseContentsSearchCommandArgs([
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
    ]);

    expect(options).toEqual({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: "01368637",
      presenterName: "IR",
      page: 2,
      sortBy: "reportName",
      sortDirection: "asc",
      reportName: "정기주주총회결과",
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseContentsSearchCommandArgs([])).toEqual({});
  });

  test("rejects invalid integer options early", () => {
    expect(() =>
      parseContentsSearchCommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--page",
        "nope",
      ]),
    ).toThrow(
      "option '--page <number>' argument 'nope' is invalid. 정수를 입력해야 하지만 \"nope\"을(를) 받았습니다.",
    );
  });

  test("documents the explicit CLI surface locally", () => {
    expect(contentsSearchUsage).toContain("--page <number>");
    expect(contentsSearchUsage).toContain("--sort-by <date|reportName>");
    expect(contentsSearchUsage).toContain("--sort-direction <asc|desc>");
    expect(contentsSearchUsage).toContain("--keyword <text>");
    expect(contentsSearchUsage).toContain("--start-date <YYYYMMDD>");
    expect(contentsSearchUsage).toContain("--end-date <YYYYMMDD>");
    expect(contentsSearchUsage).toContain("--company-code <text>");
    expect(contentsSearchUsage).toContain("--presenter-name <text>");
    expect(contentsSearchUsage).toContain("--report-name <text>");
  });

  test("renders CLI-owned descriptions, notes, and examples in usage", () => {
    expect(contentsSearchUsage).toContain(
      "내부 dsab007 재현 어댑터를 통해 DART 공시 본문 검색을 읽기 전용 의미 기반 입력으로 제공합니다.",
    );
    expect(contentsSearchUsage).toContain("dsab007 재현 어댑터");
    expect(contentsSearchUsage).toContain(
      "이 모드의 페이지 크기와 페이지 이동 폭은 현재 DART가 제어",
    );
    expect(contentsSearchUsage).toContain("[확인됨]");
    expect(contentsSearchUsage).toContain(
      "darty contents-search --keyword 배당 --start-date 20250331 --end-date 20260331",
    );
    expect(contentsSearchUsage).not.toContain("--limit");
    expect(contentsSearchUsage).not.toContain("--company-name");
    expect(contentsSearchUsage).not.toContain("text-crp-nm");
  });

  test("resolves parsed options through the shared capability resolver", () => {
    const request = resolveContentsSearchRequest(
      parseContentsSearchCommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ]) as Record<string, unknown>,
    );

    expect(request).toEqual({
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

  test("passes parsed semantic options to the command runner", async () => {
    let received:
      | ReturnType<typeof parseContentsSearchCommandArgs>
      | undefined;

    const command = createContentsSearchCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "contents-search",
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
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: "01368637",
      page: 2,
      sortDirection: "asc",
    });
  });

  test("rejects invalid capability input before execution", async () => {
    try {
      await executeContentsSearchCommand(
        {
          startDate: "20250331",
          endDate: "20260331",
        },
        {
          runOperation: (input) =>
            executeContentsSearch(input, {
              search: async () => {
                throw new Error("Provider should not be called for invalid input.");
              },
            }),
          writeStdout: () => undefined,
        },
      );
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ContentsSearchFailure);

      if (!(error instanceof ContentsSearchFailure)) {
        throw error;
      }

      expect(error.code).toBe("invalid_request");
      expect(error.parameter).toBe("keyword");
      expect(error.message).toBe(
        '필수 매개변수 "keyword"이(가) 없습니다. 필요한 값: 비어 있지 않은 문자열.',
      );
    }
  });

  test("prints a single JSON payload with the capability result", async () => {
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
        items: [],
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

    const command = createContentsSearchCommandWithRunner((options) =>
      executeContentsSearchCommand(options, {
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
        "contents-search",
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
    expect(writes).toEqual([JSON.stringify(result, null, 2)]);
  });
});
