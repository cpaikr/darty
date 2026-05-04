import type { ContentsSearchCliScenario } from "../cli-scenarios.ts";
import { evaluateAgentCliInvocation } from "./invocation-assertions.ts";
import { callOpenAi } from "./openai-chat.ts";
import { agentCliTools, executeAgentCliToolCall } from "./tools.ts";
import type { ChatMessage, ScenarioRunResult, ToolExecution } from "./types.ts";

export const runAgentCliScenario = async (input: {
  readonly scenario: ContentsSearchCliScenario;
  readonly repoRoot: string;
  readonly model: string;
  readonly openAiApiKey: string;
}): Promise<ScenarioRunResult> => {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an assistant with access to a local darty CLI runner.

Use run_darty_cli when the user's request requires live DART data. Do not guess filing identifiers, URLs, or search results.`,
    },
    { role: "user", content: input.scenario.task },
  ];
  const toolExecutions: ToolExecution[] = [];
  let finalAnswer = "";

  for (let turn = 0; turn < 6; turn += 1) {
    const response = await callOpenAi({
      apiKey: input.openAiApiKey,
      model: input.model,
      messages,
      tools: agentCliTools,
    });

    if (response.toolCalls.length === 0) {
      finalAnswer = response.content;
      break;
    }

    messages.push({
      role: "assistant",
      content: response.content.length > 0 ? response.content : null,
      tool_calls: response.toolCalls,
    });

    for (const toolCall of response.toolCalls) {
      const toolExecution = await executeAgentCliToolCall(input.repoRoot, toolCall);
      toolExecutions.push(toolExecution);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolExecution),
      });
    }
  }

  const reasons = evaluateAgentCliInvocation(input.scenario, toolExecutions);

  return {
    scenario: input.scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer,
    toolExecutions,
  };
};
