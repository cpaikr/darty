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

  test("documents the explicit CLI surface locally", () => {
    expect(viewReportUsage).toContain("--receipt <receipt-or-url>");
    expect(viewReportUsage).toContain("--document-id <id>");
    expect(viewReportUsage).toContain("--section-id <id>");
    expect(viewReportUsage).toContain("--output-format <html|markdown>");
    expect(viewReportUsage).toContain("[기본값: markdown]");
    expect(viewReportUsage).toContain("JSON 결과의 본문 형식(html 또는");
    expect(viewReportUsage).toContain("markdown)");
    expect(viewReportUsage).toContain("--max-bytes <number>");
    expect(viewReportUsage).toContain(
      "[기본값: 50000] 반환할 본문 최대 바이트 수",
    );
    expect(viewReportUsage).toContain("--verbose");
    expect(viewReportUsage).toContain("--toc-depth <number>");
    expect(viewReportUsage).toContain("--pretty");
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

  test("omits full documents and toc from section body output by default", async () => {
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
          truncated: false,
          body: "본문",
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

    const payload = JSON.parse(writes[0]!) as { result: Record<string, unknown> };
    expect(payload.result.documents).toBeUndefined();
    expect(payload.result.toc).toBeUndefined();
    expect(payload.result.document).toBeDefined();
    expect(payload.result.content).toBeDefined();
  });

  test("includes section locator fields in verbose output", async () => {
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
            children: [],
          },
        ],
        content: {
          scope: "section" as const,
          format: "html" as const,
          sizeBytes: 100,
          returnedBytes: 100,
          truncated: false,
          body: "본문",
        },
      },
    } as const;

    await executeViewReportCommand(
      {
        request: {
          receipt: "20260331004166",
          sectionId: "section:1",
        },
        output: { pretty: false, verbose: true },
      },
      {
        runOperation: async (input) => {
          expect(input).toEqual({
            receipt: "20260331004166",
            sectionId: "section:1",
          });
          return sectionResult;
        },
        writeStdout: (text) => {
          writes.push(text);
        },
      },
    );

    expect(writes).toEqual([JSON.stringify(sectionResult)]);
  });

  test("limits included TOC depth", async () => {
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
                children: [
                  {
                    id: "section:1.1.1",
                    title: "가. 개요",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    } as const;

    await executeViewReportCommand(
      {
        request: {
          receipt: "20260331004166",
          sectionId: "section:1",
        },
        output: { pretty: false, verbose: false, tocDepth: 2 },
      },
      {
        runOperation: async () => sectionResult,
        writeStdout: (text) => {
          writes.push(text);
        },
      },
    );

    const payload = JSON.parse(writes[0]!) as {
      result: {
        documents?: unknown;
        toc?: Array<{ children: Array<{ children: unknown[] }> }>;
      };
    };
    expect(payload.result.documents).toBeDefined();
    expect(payload.result.toc?.[0]?.children[0]?.children).toEqual([]);
  });
});
