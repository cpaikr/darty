import { callOpenAi } from "./openai-chat.ts";
import type { ChatMessage, ToolCall, ToolExecution } from "./tool-trace.ts";

export type ModelLoopResult<ToolName extends string> = {
  readonly termination: "final-response" | "response-budget-exhaustion" | "request-failed" | "tool-failed";
  readonly responseCount: number;
  readonly toolCallCount: number;
  readonly error?: string;
  readonly finalized: boolean;
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
  readonly request?: typeof callOpenAi<ToolName>;
  readonly executeToolCall: (toolCall: ToolCall<ToolName>) => Promise<ToolExecution<ToolName>>;
  readonly toToolMessageContent: (execution: ToolExecution<ToolName>) => string;
}): Promise<ModelLoopResult<ToolName>> => {
  const messages: ChatMessage<ToolName>[] = [
    { role: "system", content: input.systemPrompt },
    { role: "user", content: input.userPrompt },
  ];
  const toolExecutions: ToolExecution<ToolName>[] = [];
  if (!Number.isInteger(input.maxTurns) || input.maxTurns < 2) {
    throw new Error("maxTurns must include at least one tool response and one finalization response");
  }
  let responseCount = 0;
  let finalized = false;
  const finish = (termination: ModelLoopResult<ToolName>["termination"], finalAnswer = "", error?: string): ModelLoopResult<ToolName> => ({
    termination, finalAnswer, responseCount, toolCallCount: toolExecutions.length,
    finalized, ...(error === undefined ? {} : { error }), toolExecutions, messages,
  });
  const safeError = (error: unknown): string =>
    (error instanceof Error ? error.message : String(error)).replaceAll(input.openAiApiKey, "<redacted>");

  for (let turn = 0; turn < input.maxTurns; turn += 1) {
    finalized = turn === input.maxTurns - 1;
    if (finalized) messages.push({ role: "user", content: "The tool budget is complete. Answer now using only observed evidence, or state precisely what remains missing. No further tools are available." });
    let response;
    try {
      response = await (input.request ?? callOpenAi)({
        apiKey: input.openAiApiKey, model: input.model, messages,
        tools: finalized ? [] : input.tools,
        toolNames: finalized ? new Set<ToolName>() : input.toolNames,
      });
      responseCount += 1;
    } catch (error) {
      return finish("request-failed", "", safeError(error));
    }
    if (response.toolCalls.length === 0) {
      messages.push({ role: "assistant", content: response.content });
      return finish(response.content.trim() ? "final-response" : "response-budget-exhaustion", response.content);
    }
    if (finalized) return finish("response-budget-exhaustion");
    messages.push({ role: "assistant", content: response.content || null, tool_calls: response.toolCalls });
    for (const toolCall of response.toolCalls) {
      try {
        const execution = await input.executeToolCall(toolCall);
        toolExecutions.push(execution);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: input.toToolMessageContent(execution) });
      } catch (error) {
        return finish("tool-failed", "", safeError(error));
      }
    }
  }
  return finish("response-budget-exhaustion");
};
