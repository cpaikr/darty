import { callOpenAi } from "./openai-chat.ts";
import type { ChatMessage, ToolCall, ToolExecution } from "./tool-trace.ts";

export type ModelLoopResult<ToolName extends string> = {
  readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution<ToolName>[];
  readonly messages: readonly ChatMessage<ToolName>[];
};

export const runModelToolLoop = async <ToolName extends string>(input: {
  readonly openAiApiKey: string;
  readonly model: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly tools: readonly unknown[];
  readonly toolNames: ReadonlySet<ToolName>;
  readonly maxTurns: number;
  readonly executeToolCall: (toolCall: ToolCall<ToolName>) => Promise<ToolExecution<ToolName>>;
  readonly toToolMessageContent: (execution: ToolExecution<ToolName>) => string;
}): Promise<ModelLoopResult<ToolName>> => {
  const messages: ChatMessage<ToolName>[] = [
    { role: "system", content: input.systemPrompt },
    { role: "user", content: input.userPrompt },
  ];
  const toolExecutions: ToolExecution<ToolName>[] = [];
  let finalAnswer = "";

  for (let turn = 0; turn < input.maxTurns; turn += 1) {
    const response = await callOpenAi({
      apiKey: input.openAiApiKey,
      model: input.model,
      messages,
      tools: input.tools,
      toolNames: input.toolNames,
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
      const toolExecution = await input.executeToolCall(toolCall);
      toolExecutions.push(toolExecution);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: input.toToolMessageContent(toolExecution),
      });
    }
  }

  return { finalAnswer, toolExecutions, messages };
};
