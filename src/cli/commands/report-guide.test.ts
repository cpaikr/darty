import { describe, expect, test } from "bun:test";

import { reportGuideMarkdown } from "../../capabilities/report-guide/content.ts";
import {
  createReportGuideCommandWithRunner,
  executeReportGuideCommand,
  parseReportGuideCommandArgs,
  reportGuideUsage,
} from "./report-guide.ts";

const result = {
  result: {
    request: {},
    title: "DART report information guide",
    contentMarkdown: reportGuideMarkdown,
  },
  metadata: {
    source: {
      status: "bundled_project_document" as const,
      path: "docs/research/dart-report-guide.md",
    },
  },
  references: {
    guidePath: "docs/research/dart-report-guide.md",
    sourceUrls: [],
  },
  warnings: [],
};

describe("parseReportGuideCommandArgs", () => {
  test("accepts no options", () => {
    expect(parseReportGuideCommandArgs([])).toEqual({
      request: {},
      output: { pretty: false },
    });
  });

  test("documents the simple CLI surface locally", () => {
    expect(reportGuideUsage).toContain("DART report information guide");
    expect(reportGuideUsage).toContain("darty report-guide");
    expect(reportGuideUsage).toContain("network-free");
  });

  test("passes an empty request to the command runner", async () => {
    let received: Record<string, unknown> | undefined;
    const command = createReportGuideCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(["node", "report-guide"], { from: "node" });

    expect(received).toEqual({
      request: {},
      output: { pretty: false },
    });
  });
});

describe("executeReportGuideCommand", () => {
  test("prints the Markdown guide directly for human CLI use", async () => {
    let output: string | undefined;

    await executeReportGuideCommand(
      { request: {}, output: { pretty: false } },
      {
        runOperation: async () => result,
        writeStdout: (text) => {
          output = text;
        },
      },
    );

    expect(output).toBe(reportGuideMarkdown);
    expect(output).toContain("# DART report information guide");
    expect(output).toContain("사업보고서");
    expect(output).toContain("주요사항보고서");
    expect(output).toContain("주식등의 대량보유상황보고서");
  });
});
