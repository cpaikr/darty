import { describe, expect, test } from "bun:test";

import { getExecutionFailureRecoveryHint } from "../recovery-hints.ts";
import { reportGuideMarkdown, reportGuideSourceUrls } from "./content.ts";
import { executeReportGuide } from "./execute.ts";

describe("executeReportGuide", () => {
  test("returns the bundled Markdown guide without network input", async () => {
    await expect(executeReportGuide({})).resolves.toMatchObject({
      result: {
        request: {},
        title: "DART report information guide",
        contentMarkdown: reportGuideMarkdown,
      },
      metadata: {
        source: {
          status: "bundled_project_document",
          path: "docs/research/dart-report-guide.md",
        },
      },
      references: {
        guidePath: "docs/research/dart-report-guide.md",
        sourceUrls: [...reportGuideSourceUrls],
      },
      warnings: [],
    });
  });

  test("rejects unexpected request fields", async () => {
    await expect(executeReportGuide({ topic: "사업보고서" })).rejects.toMatchObject({
      name: "ReportGuideFailure",
      code: "invalid_request",
      retryable: false,
      parameter: "topic",
    });
  });

  test("adds recovery hints to unexpected internal failures", async () => {
    const input = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("key enumeration failed");
        },
      },
    ) as Record<string, unknown>;

    await expect(executeReportGuide(input)).rejects.toMatchObject({
      name: "ReportGuideFailure",
      code: "internal_error",
      retryable: false,
      recoveryHint: getExecutionFailureRecoveryHint("internal_error", false),
    });
  });
});
