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
        detail: "raw",
      },
      output: { pretty: true, verbose: true, tocDepth: 2 },
    });
  });

  test("requests locator detail when TOC depth is set", () => {
    expect(
      parseViewReportCommandArgs([
        "--receipt",
        "20260331004166",
        "--section-id",
        "section:1",
        "--toc-depth",
        "1",
      ]),
    ).toEqual({
      request: {
        receipt: "20260331004166",
        sectionId: "section:1",
        detail: "detailed",
      },
      output: { pretty: false, verbose: false, tocDepth: 1 },
    });
  });

  test("keeps explicit concise detail authoritative with TOC depth", () => {
    expect(
      parseViewReportCommandArgs([
        "--receipt",
        "20260331004166",
        "--section-id",
        "section:1",
        "--toc-depth",
        "1",
        "--detail",
        "concise",
      ]),
    ).toEqual({
      request: {
        receipt: "20260331004166",
        sectionId: "section:1",
        detail: "concise",
      },
      output: { pretty: false, verbose: false, tocDepth: 1 },
    });
  });

  test("rejects non-positive TOC depth options early", () => {
    expect(() =>
      parseViewReportCommandArgs(["--receipt", "20260331004166", "--toc-depth", "0"]),
    ).toThrow(
      "option '--toc-depth <number>' argument '0' is invalid. Expected an integer greater than or equal to 1.",
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
      "option '--content-start-byte <number>' argument '-1' is invalid. Expected an integer greater than or equal to 0.",
    );
  });

  test("documents the explicit CLI surface locally", () => {
    expect(viewReportUsage).toContain("--receipt <receipt-or-url>");
    expect(viewReportUsage).toContain("[required] DART receipt number or viewer URL");
    expect(viewReportUsage).toContain("--document-id <id>");
    expect(viewReportUsage).toContain("Darty document ID to fetch");
    expect(viewReportUsage).toContain("not DART dcmNo");
    expect(viewReportUsage).toContain("--section-id <id>");
    expect(viewReportUsage).toContain("report-specific");
    expect(viewReportUsage).toContain("--output-format <html|markdown>");
    expect(viewReportUsage).toContain("[default: markdown]");
    expect(viewReportUsage).toContain("Body format in the JSON");
    expect(viewReportUsage).toContain("result (html or markdown)");
    expect(viewReportUsage).toContain("--max-bytes <number>");
    expect(viewReportUsage).toContain("[default: 50000, range: 1000~1000000]");
    expect(viewReportUsage).toContain("body bytes to return");
    expect(viewReportUsage).toContain("increase output/context size");
    expect(viewReportUsage).toContain("--content-start-byte <number>");
    expect(viewReportUsage).toContain("Continue with the same outputFormat");
    expect(viewReportUsage).toContain("--verbose");
    expect(viewReportUsage).toContain("Locators are documents/toc");
    expect(viewReportUsage).toContain("follow-up");
    expect(viewReportUsage).toContain("retrieval");
    expect(viewReportUsage).toContain("does not change content.body");
    expect(viewReportUsage).toContain("rendering or windows");
    expect(viewReportUsage).toContain("concise omits documents/toc");
    expect(viewReportUsage).toContain("If --detail is omitted, request");
    expect(viewReportUsage).toContain("detail=raw");
    expect(viewReportUsage).toContain("--toc-depth <number>");
    expect(viewReportUsage).toContain("Include TOC entries to the specified depth");
    expect(viewReportUsage).toContain("--pretty");
    expect(viewReportUsage).toContain("Cautions");
    expect(viewReportUsage).toContain("years, corrections, or other receipt numbers");
    expect(viewReportUsage).toContain("content.body is returned");
    expect(viewReportUsage).toContain("content.window.nextStartByte");
    expect(viewReportUsage).toContain(
      "--content-start-byte <content.window.nextStartByte>",
    );
    expect(viewReportUsage).toContain("View TOC from a search-body viewerUrl");
    expect(viewReportUsage).toContain("filing.receiptNumber");
    expect(viewReportUsage).toContain("<documents[].id>");
    expect(viewReportUsage).toContain("<toc[].id>");
    expect(viewReportUsage).toContain("Read a long section in a small window");
    expect(viewReportUsage).toContain("content.isFullContent");
    expect(viewReportUsage).toContain("`--detail` changes only supplemental locator fields");
    expect(viewReportUsage).toContain("Darty does not process PDFs internally");
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
        '필수 매개변수 "receipt"이(가) 없습니다. 필요한 값: 14자리 DART 접수번호 또는 rcpNo를 포함한 /dsaf001/main.do viewer URL.',
      parameter: "receipt",
      retryable: false,
    });

    expect(renderViewReportCliErrorMessage(error)).toBe(
      '필수 옵션 "--receipt"이(가) 없습니다. 필요한 값: 14자리 DART 접수번호 또는 rcpNo를 포함한 /dsaf001/main.do viewer URL.',
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
