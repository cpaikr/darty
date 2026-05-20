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
      output: { pretty: false, verbose: true },
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseSearchBodyCommandArgs([])).toEqual({
      request: {},
      output: { pretty: false, verbose: false },
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
    ).toThrow(
      "option '--page <number>' argument 'nope' is invalid. 정수를 입력해야 하지만 \"nope\"을(를) 받았습니다.",
    );
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
    expect(searchBodyUsage).toContain("원문 검증 정보(evidence) 포함 수준");
    expect(searchBodyUsage).toContain("DART 결과 행 원문, snippet HTML");
    expect(searchBodyUsage).toContain("CLI에서");
    expect(searchBodyUsage).toContain("evidence를 보려면 --verbose");
    expect(searchBodyUsage).toContain("--detail을 생략하면 요청 detail=raw로 처리합니다.");
    expect(searchBodyUsage).toContain("명령 도움말을 표시합니다.");
    expect(searchBodyUsage).not.toContain("--include-evidence");
    expect(searchBodyUsage).not.toContain("display help for command");
  });

  test("renders CLI-owned descriptions, notes, and examples in usage", () => {
    expect(searchBodyUsage).toContain(
      "DART 공시통합검색의 `본문내용` 모드로 제출 공시문서 내용을 검색합니다.",
    );
    expect(searchBodyUsage).toContain("DART 공통 검색 문법");
    expect(searchBodyUsage).toContain("`사과|포도`=OR");
    expect(searchBodyUsage).toContain(
      "DART 회사 코드(8자리 숫자). 자유 입력 회사명은 지원하지 않습니다.",
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
    expect(searchBodyUsage).toContain("검색 팁:");
    expect(searchBodyUsage).toContain(
      "본문내용 검색은 문서 단위 키워드 검색입니다.",
    );
    expect(searchBodyUsage).toContain(
      "같은 문단/표/항목에 함께 있다는 뜻은 아닙니다.",
    );
    expect(searchBodyUsage).toContain(
      "결과의 viewerUrl 또는 접수번호를 view-report에 넘겨 실제 보고서 본문을 확인하세요.",
    );
    expect(searchBodyUsage).toContain(
      "DART 행 원문이나 snippet HTML 같은 원문 검증 정보(evidence)",
    );
    expect(searchBodyUsage).toContain(
      "raw도 DART 검색 HTML 전체를 출력하지 않고 행 단위 검증 필드만 추가합니다.",
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
      output: { pretty: false, verbose: false },
    });
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new SearchBodyFailure({
      code: "invalid_request",
      message:
        '필수 매개변수 "startDate"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
      parameter: "startDate",
      retryable: false,
    });

    expect(renderSearchBodyCliErrorMessage(error)).toBe(
      '필수 옵션 "--start-date"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
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
          output: { pretty: false, verbose: false },
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
        '필수 매개변수 "keyword"이(가) 없습니다. 필요한 값: 비어 있지 않은 문자열.',
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
