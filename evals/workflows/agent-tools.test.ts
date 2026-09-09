import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { toTruncatedToolMessageContent } from "../harness/tool-trace.ts";
import { executeAgentCliToolCall } from "../search-body/agent-cli/tools.ts";
import { evaluateAgentCliInvocation } from "../search-body/agent-cli/invocation-assertions.ts";
import { searchBodyCliScenarios, type SearchBodyCliScenario } from "../search-body/shared/cli-scenarios.ts";
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
    await mkdir(join(repoRoot, "target/release"), { recursive: true });
    const executable = join(repoRoot, "target/release/darty");
    await writeFile(executable, `#!${process.execPath}\n${source}`, "utf8");
    await chmod(executable, 0o755);
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

test("search-body assertions parse complete subprocess output beyond the trace limit", async () => {
  const scenario: SearchBodyCliScenario = searchBodyCliScenarios[0]!;
  const payload = { result: { request: {
    keyword: scenario.keyword, startDate: scenario.startDate, endDate: scenario.endDate,
    ...(scenario.companyCode === undefined ? {} : { companyCode: scenario.companyCode }),
  }, body: "x".repeat(20_000) } };
  const execution = await withFakeCli(
    `console.log(${JSON.stringify(JSON.stringify(payload))});`,
    (repoRoot) => executeAgentCliToolCall(repoRoot, {
      ...toolCall, function: { name: "run_darty_cli", arguments: JSON.stringify({ argv: scenario.argv }) },
    }),
  );
  expect(execution.exitCode).toBe(0);
  expect(evaluateAgentCliInvocation(scenario, [execution])).toEqual([]);
  expect(JSON.parse(execution.stdout)).toEqual(payload);
  expect(toTruncatedToolMessageContent(execution)).toContain("...<truncated>");
});

test("both wrappers accept their CLI help subcommands", async () => {
  const { validateWorkflowCliArgv } = await import("./agent-tools.ts");
  const { validateDartyCliArgv } = await import("../search-body/agent-cli/tools.ts");
  for (const argv of [["help"], ["help", "view-report"]]) expect(validateWorkflowCliArgv(argv).ok).toBe(true);
  for (const argv of [["help"], ["help", "search-body"]]) expect(validateDartyCliArgv(argv).ok).toBe(true);
  expect(validateWorkflowCliArgv(["help", "company-detail"]).ok).toBe(false);
  expect(validateDartyCliArgv(["help", "view-report"]).ok).toBe(false);
});

test("bounds inherited output streams after the CLI parent exits", async () => {
  const startedAt = performance.now();
  const execution = await withFakeCli(
    `Bun.spawn([process.execPath, "-e", "setTimeout(() => {}, 1500)"], { stdout: "inherit", stderr: "inherit" }); process.exit(0);`,
    repoRoot => executeWorkflowToolCall(repoRoot, toolCall, { commandTimeoutMs: 1000, streamGraceMs: 20 }),
  );
  expect(execution.exitCode).toBe(124);
  expect(execution.stderr).toContain("deadline exceeded");
  expect(performance.now() - startedAt).toBeLessThan(1200);
});
test("the shared subprocess environment excludes model credentials", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fictional-secret-for-test";
  try {
    const execution = await withFakeCli(`console.log(JSON.stringify({ hasModelKey: !!process.env.OPENAI_API_KEY }));`,
      repoRoot => executeWorkflowToolCall(repoRoot, toolCall));
    expect(JSON.parse(execution.stdout)).toEqual({ hasModelKey: false });
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
