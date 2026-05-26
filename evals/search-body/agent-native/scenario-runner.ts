import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";
import { dartyAgentToolNames } from "../../../src/app/agent-tools.ts";
import { runModelToolLoop } from "../../harness/model-loop.ts";
import { evaluateAgentNativeInvocation } from "./invocation-assertions.ts";
import {
  agentNativeTools,
  executeAgentNativeToolCall,
  toAgentNativeToolMessageContent,
} from "./tools.ts";
import type { AgentNativeToolName, ScenarioRunResult } from "./types.ts";

export const runAgentNativeScenario = async (input: {
  readonly scenario: SearchBodyCliScenario;
  readonly model: string;
  readonly openAiApiKey: string;
}): Promise<ScenarioRunResult> => {
  const loop = await runModelToolLoop<AgentNativeToolName>({
    openAiApiKey: input.openAiApiKey,
    model: input.model,
    systemPrompt: `You are an assistant with access to typed local darty tools.

Use the darty_* tools when the user's request requires live DART data. Do not guess filing identifiers, URLs, or search results.`,
    userPrompt: input.scenario.agentNativeTask,
    tools: agentNativeTools,
    toolNames: new Set(dartyAgentToolNames),
    maxTurns: 6,
    executeToolCall: executeAgentNativeToolCall,
    toToolMessageContent: toAgentNativeToolMessageContent,
  });

  const reasons = evaluateAgentNativeInvocation(input.scenario, loop.toolExecutions);

  return {
    scenario: input.scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
  };
};
