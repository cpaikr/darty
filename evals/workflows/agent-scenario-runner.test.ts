import { afterEach, expect, test } from "bun:test";
import { runAgentWorkflowScenario } from "./agent-scenario-runner.ts";
import { agentWorkflowScenarios } from "./agent-scenarios.ts";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test("failed model output is preserved and is the reason judging is skipped", async () => {
  globalThis.fetch = (async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: {
    content: "", tool_calls: [{ id: "wrong", type: "function", function: { name: "forbidden", arguments: "{}" } }],
  } }] }))) as typeof fetch;
  const result = await runAgentWorkflowScenario({ scenario: agentWorkflowScenarios[0]!, repoRoot: process.cwd(), model: "fake", judgeModel: "fake", openAiApiKey: "fake" });
  expect(result.pass).toBe(false);
  expect(result.loop.termination).toBe("invalid-response");
  expect(result.loop.responseCount).toBe(1);
  expect(result.finalAnswerJudge.status).toBe("skipped");
  expect(result.finalAnswerJudge.reasons.join(" ")).toContain("model loop ended with invalid-response");
});
