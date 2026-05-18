import { isDartyAgentToolName } from "../../../src/app/agent-tools.ts";
import type { ChatMessage, ToolCall } from "./types.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const callOpenAi = async (input: {
  readonly apiKey: string;
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly tools: readonly unknown[];
}): Promise<{ readonly content: string; readonly toolCalls: readonly ToolCall[] }> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      tools: input.tools,
      tool_choice: "auto",
      max_completion_tokens: 1_200,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}: ${bodyText}`);
  }

  const body: unknown = JSON.parse(bodyText);
  if (!isRecord(body)) {
    throw new Error("OpenAI response was not an object.");
  }

  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    throw new Error("OpenAI response did not include a choice.");
  }

  const message = choices[0].message;
  if (!isRecord(message)) {
    throw new Error("OpenAI choice did not include a message.");
  }

  const content = typeof message.content === "string" ? message.content : "";
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls.filter((toolCall): toolCall is ToolCall => {
        if (!isRecord(toolCall)) {
          return false;
        }
        const candidateFunction = toolCall.function;
        return (
          typeof toolCall.id === "string" &&
          toolCall.type === "function" &&
          isRecord(candidateFunction) &&
          isDartyAgentToolName(candidateFunction.name) &&
          typeof candidateFunction.arguments === "string"
        );
      })
    : [];

  return { content, toolCalls };
};
