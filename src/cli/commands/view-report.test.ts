import { describe, expect, test } from "bun:test";

import { ViewReportFailure } from "../../capabilities/view-report/contract.ts";
import {
  createViewReportCommandWithRunner,
  executeViewReportCommand,
  parseViewReportCommandArgs,
  renderViewReportCliErrorMessage,
  viewReportUsage,
} from "./view-report.ts";

const result = {
  result: {
    request: {
      receipt: "20260331004166",
      documentId: undefined,
      sectionId: undefined,
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
    },
    receipt: {
      receiptNumber: "20260331004166",
    },
    document: {
      id: "document:body:1",
      title: "사업보고서",
      kind: "body" as const,
      selected: true,
    },
    documents: [
      {
        id: "document:body:1",
        title: "사업보고서",
        kind: "body" as const,
        selected: true,
      },
    ],
    toc: [],
  },
  metadata: {
    fetchedAt: "2026-05-05T00:00:00.000Z",
    source: {
      system: "dart" as const,
      surface: "dsaf001" as const,
      endpoints: {
        shell: "https://dart.fss.or.kr/dsaf001/main.do",
      },
    },
    tocSource: "none" as const,
    outputFormat: "html" as const,
  },
  references: {
    viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
  },
  warnings: [],
} as const;

describe("parseViewReportCommandArgs", () => {
  test("parses semantic view-report flags", () => {
    expect(
      parseViewReportCommandArgs([
        "--receipt",
        "20260331004166",
        "--document-id",
        "document:attachment:1",
        "--section-id",
        "section:1.2",
        "--output-format",
        "markdown",
        "--max-bytes",
        "50000",
        "--content-start-byte",
        "25000",
        "--verbose",
        "--toc-depth",
        "2",
        "--pretty",
      ]),
    ).toEqual({
      request: {
        receipt: "20260331004166",
        documentId: "document:attachment:1",
        sectionId: "section:1.2",
        outputFormat: "markdown",
        maxBytes: 50000,
        contentStartByte: 25000,
      },
      output: { pretty: true, verbose: true, tocDepth: 2 },
    });
  });

  test("rejects non-positive TOC depth options early", () => {
    expect(() =>
      parseViewReportCommandArgs(["--receipt", "20260331004166", "--toc-depth", "0"]),
    ).toThrow(
      "option '--toc-depth <number>' argument '0' is invalid. 1 이상의 정수를 입력해야 합니다.",
    );
  });

  test("rejects negative content window starts early", () => {
    expect(() =>
      parseViewReportCommandArgs([
        "--receipt",
        "20260331004166",
        "--content-start-byte",
        "-1",
      ]),
    ).toThrow(
      "option '--content-start-byte <number>' argument '-1' is invalid. 0 이상의 정수를 입력해야 합니다.",
    );
  });

  test("documents the explicit CLI surface locally", () => {
    expect(viewReportUsage).toContain("--receipt <receipt-or-url>");
    expect(viewReportUsage).toContain("--document-id <id>");
    expect(viewReportUsage).toContain("--section-id <id>");
    expect(viewReportUsage).toContain("보고서별 값");
    expect(viewReportUsage).toContain("--output-format <html|markdown>");
    expect(viewReportUsage).toContain("[기본값: markdown]");
    expect(viewReportUsage).toContain("JSON 결과의 본문 형식(html 또는");
    expect(viewReportUsage).toContain("markdown)");
    expect(viewReportUsage).toContain("--max-bytes <number>");
    expect(viewReportUsage).toContain("[기본값: 50000, 범위: 1000~1000000]");
    expect(viewReportUsage).toContain("반환할 본문 최대 바이트");
    expect(viewReportUsage).toContain("출력/context가 커질 수 있습니다");
    expect(viewReportUsage).toContain("--content-start-byte <number>");
    expect(viewReportUsage).toContain("outputFormat으로 이어서 읽으세요");
    expect(viewReportUsage).toContain("--verbose");
    expect(viewReportUsage).toContain("--toc-depth <number>");
    expect(viewReportUsage).toContain("--pretty");
    expect(viewReportUsage).toContain("주의사항");
    expect(viewReportUsage).toContain("연도, 정정, 다른 접수번호");
    expect(viewReportUsage).toContain("content.body가 반환됩니다");
    expect(viewReportUsage).toContain("content.window.nextStartByte");
    expect(viewReportUsage).toContain(
      "--content-start-byte <content.window.nextStartByte>",
    );
    expect(viewReportUsage).toContain("search-body 결과의 viewerUrl로 목차 보기");
    expect(viewReportUsage).toContain("긴 섹션을 작은 창으로 읽기");
    expect(viewReportUsage).toContain("content.isFullContent");
    expect(viewReportUsage).toContain("PDF는 darty 내부에서 처리하지 않습니다");
    expect(viewReportUsage).not.toContain("--include-toc");
  });

  test("passes parsed options to the command runner", async () => {
    let received: Record<string, unknown> | undefined;
    const command = createViewReportCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "view-report",
        "--receipt",
        "20260331004166",
        "--section-id",
        "section:1",
      ],
      { from: "node" },
    );

    expect(received).toEqual({
      request: {
        receipt: "20260331004166",
        sectionId: "section:1",
      },
      output: { pretty: false, verbose: false },
    });
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new ViewReportFailure({
      code: "invalid_request",
      message:
        '필수 매개변수 "receipt"이(가) 없습니다. 필요한 값: DART 접수번호 또는 rcpNo를 포함한 viewer URL.',
      parameter: "receipt",
      retryable: false,
    });

    expect(renderViewReportCliErrorMessage(error)).toBe(
      '필수 옵션 "--receipt"이(가) 없습니다. 필요한 값: DART 접수번호 또는 rcpNo를 포함한 viewer URL.',
    );
  });

  test("prints a compact JSON payload with the capability result", async () => {
    const writes: string[] = [];
    let receivedInput: Record<string, unknown> | undefined;

    await executeViewReportCommand(
      {
        request: { receipt: "20260331004166" },
        output: { pretty: false, verbose: false },
      },
      {
        runOperation: async (input) => {
          receivedInput = input;
          return result;
        },
        writeStdout: (text) => {
          writes.push(text);
        },
      },
    );

    expect(receivedInput).toEqual({ receipt: "20260331004166" });
    expect(writes).toEqual([JSON.stringify(result)]);
  });

  test("pretty prints JSON when requested", async () => {
    const writes: string[] = [];

    await executeViewReportCommand(
      {
        request: { receipt: "20260331004166" },
        output: { pretty: true, verbose: false },
      },
      {
        runOperation: async () => result,
        writeStdout: (text) => {
          writes.push(text);
        },
      },
    );

    expect(writes).toEqual([JSON.stringify(result, undefined, 2)]);
  });

  test("prints a section JSON payload with the capability result", async () => {
    const writes: string[] = [];
    const sectionResult = {
      ...result,
      result: {
        ...result.result,
        request: {
          ...result.result.request,
          sectionId: "section:1",
        },
        toc: [
          {
            id: "section:1",
            title: "I. 회사의 개요",
            children: [
              {
                id: "section:1.1",
                title: "1. 회사의 개요",
                children: [],
              },
            ],
          },
        ],
        content: {
          scope: "section" as const,
          format: "html" as const,
          sizeBytes: 100,
          returnedBytes: 100,
          isFullContent: true,
          body: "본문",
          window: {
            unit: "utf8-bytes" as const,
            startByte: 0,
            endByte: 100,
            hasMore: false,
          },
        },
      },
    } as const;

    await executeViewReportCommand(
      {
        request: {
          receipt: "20260331004166",
          sectionId: "section:1",
        },
        output: { pretty: false, verbose: false },
      },
      {
        runOperation: async () => sectionResult,
        writeStdout: (text) => {
          writes.push(text);
        },
      },
    );

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]!).result.request).toEqual(
      sectionResult.result.request,
    );
  });
});
