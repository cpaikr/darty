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
        "html",
        "--max-bytes",
        "50000",
      ]),
    ).toEqual({
      receipt: "20260331004166",
      documentId: "document:attachment:1",
      sectionId: "section:1.2",
      outputFormat: "html",
      maxBytes: 50000,
    });
  });

  test("documents the explicit CLI surface locally", () => {
    expect(viewReportUsage).toContain("--receipt <receipt-or-url>");
    expect(viewReportUsage).toContain("--document-id <id>");
    expect(viewReportUsage).toContain("--section-id <id>");
    expect(viewReportUsage).toContain("--output-format <html>");
    expect(viewReportUsage).toContain(
      "[기본값: html] JSON 결과의 content.html 본문 형식",
    );
    expect(viewReportUsage).toContain("--max-bytes <number>");
    expect(viewReportUsage).toContain(
      "[기본값: 200000] 반환할 HTML 최대 바이트 수",
    );
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
      receipt: "20260331004166",
      sectionId: "section:1",
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

  test("prints a single JSON payload with the capability result", async () => {
    const writes: string[] = [];
    let receivedInput: Record<string, unknown> | undefined;

    await executeViewReportCommand(
      {
        receipt: "20260331004166",
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
    expect(writes).toEqual([JSON.stringify(result, null, 2)]);
  });
});
