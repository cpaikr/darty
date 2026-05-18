import { describe, expect, test } from "bun:test";

import { toAgentNativeToolMessageContent } from "./tools.ts";
import type { ToolExecution } from "./types.ts";

describe("agent-native eval tool message rendering", () => {
  test("keeps assertion output separate from model-facing truncation", () => {
    const longStdout = "x".repeat(20_000);
    const execution: ToolExecution = {
      toolName: "darty_search_body",
      input: { keyword: "배당", startDate: "20250331", endDate: "20260331" },
      display: "darty_search_body(...)",
      exitCode: 0,
      stdout: longStdout,
      stderr: "",
    };

    const message = JSON.parse(toAgentNativeToolMessageContent(execution)) as {
      readonly stdout: string;
    };

    expect(execution.stdout).toHaveLength(20_000);
    expect(message.stdout).toContain("...<truncated>");
    expect(message.stdout.length).toBeLessThan(execution.stdout.length);
  });
});
