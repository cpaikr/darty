import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";
import { evaluateAgentNativeInvocation } from "./invocation-assertions.ts";
import { callOpenAi } from "./openai-chat.ts";
import {
  agentNativeTools,
  executeAgentNativeToolCall,
  toAgentNativeToolMessageContent,
} from "./tools.ts";
import type { ChatMessage, ScenarioRunResult, ToolExecution } from "./types.ts";

export const runAgentNativeScenario = async (input: {
  readonly scenario: SearchBodyCliScenario;
  readonly model: string;
  readonly openAiApiKey: string;
}): Promise<ScenarioRunResult> => {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an assistant with access to typed local darty tools.

Use the darty_* tools when the user's request requires live DART data. Do not guess filing identifiers, URLs, or search results.`,
    },
    { role: "user", content: input.scenario.agentNativeTask },
  ];
  const toolExecutions: ToolExecution[] = [];
  let finalAnswer = "";

  for (let turn = 0; turn < 6; turn += 1) {
    const response = await callOpenAi({
      apiKey: input.openAiApiKey,
      model: input.model,
      messages,
      tools: agentNativeTools,
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
      const toolExecution = await executeAgentNativeToolCall(toolCall);
      toolExecutions.push(toolExecution);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toAgentNativeToolMessageContent(toolExecution),
      });
    }
  }

  const reasons = evaluateAgentNativeInvocation(input.scenario, toolExecutions);

  return {
    scenario: input.scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer,
    toolExecutions,
  };
};
