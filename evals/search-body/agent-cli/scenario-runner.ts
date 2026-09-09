import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";
import { runModelToolLoop } from "../../harness/model-loop.ts";
import { toTruncatedToolMessageContent } from "../../harness/tool-trace.ts";
import { evaluateAgentCliInvocation } from "./invocation-assertions.ts";
import { agentCliTools, executeAgentCliToolCall } from "./tools.ts";
import type { AgentCliToolName, ScenarioRunResult } from "./types.ts";

export const runAgentCliScenario = async (input: {
  readonly scenario: SearchBodyCliScenario;
  readonly repoRoot: string;
  readonly model: string;
  readonly openAiApiKey: string;
}): Promise<ScenarioRunResult> => {
  const loop = await runModelToolLoop<AgentCliToolName>({
    openAiApiKey: input.openAiApiKey,
    model: input.model,
    systemPrompt: `You are an assistant with access to a local darty CLI runner.

Use run_darty_cli when the user's request requires live DART data. Do not guess filing identifiers, URLs, or search results.`,
    userPrompt: input.scenario.task,
    tools: agentCliTools,
    toolNames: new Set(["run_darty_cli"]),
    maxTurns: 6,
    executeToolCall: (toolCall) => executeAgentCliToolCall(input.repoRoot, toolCall),
    toToolMessageContent: toTruncatedToolMessageContent,
  });

  const reasons = [...evaluateAgentCliInvocation(input.scenario, loop.toolExecutions),
    ...(loop.termination === "final-response" ? [] : [`model loop ${loop.termination}: ${loop.error ?? "no final answer"}`])];

  return {
    scenario: input.scenario,
    loop,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
  };
};
