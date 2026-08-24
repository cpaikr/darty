import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { toTruncatedToolMessageContent } from "../harness/tool-trace.ts";
import { executeWorkflowToolCall } from "./agent-tools.ts";

const toolCall = {
  id: "call-1",
  type: "function" as const,
  function: {
    name: "run_darty_cli" as const,
    arguments: JSON.stringify({
      argv: ["search-company", "--company-name", "삼성전자", "--agent"],
    }),
  },
};

const withFakeCli = async <T>(source: string, action: (repoRoot: string) => Promise<T>) => {
  const repoRoot = await mkdtemp(join(tmpdir(), "darty-agent-tools-"));
  try {
    await mkdir(join(repoRoot, "src"));
    await writeFile(join(repoRoot, "src/cli.ts"), source, "utf8");
    return await action(repoRoot);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
};

describe("workflow CLI execution", () => {
  test("preserves complete stdout while truncating only model-facing content", async () => {
    const execution = await withFakeCli(
      `console.log(JSON.stringify({ result: { body: "x".repeat(20_000) } }));`,
      (repoRoot) => executeWorkflowToolCall(repoRoot, toolCall),
    );

    expect(execution.exitCode).toBe(0);
    expect(execution.stdout.length).toBeGreaterThan(16_000);
    expect(() => JSON.parse(execution.stdout)).not.toThrow();
    expect(toTruncatedToolMessageContent(execution)).toContain("...<truncated>");
  });

  test("escalates an ignored termination signal and returns the timeout envelope", async () => {
    const startedAt = performance.now();
    const execution = await withFakeCli(
      `process.on("SIGTERM", () => {}); setInterval(() => {}, 1_000);`,
      (repoRoot) =>
        executeWorkflowToolCall(repoRoot, toolCall, {
          commandTimeoutMs: 20,
          terminationGraceMs: 20,
          streamGraceMs: 20,
        }),
    );

    expect(execution.exitCode).toBe(124);
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });
});
