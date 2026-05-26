import type { ChatMessage, ToolCall } from "./tool-trace.ts";
import { isRecord } from "./json.ts";

const RETRYABLE_OPENAI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
const MAX_OPENAI_ATTEMPTS = 4;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelayMs = (attempt: number): number => 750 * 2 ** attempt;

const fetchOpenAiChatCompletion = async (input: {
  readonly apiKey: string;
  readonly body: unknown;
}): Promise<string> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_OPENAI_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.body),
      });
    } catch (error) {
      if (attempt === MAX_OPENAI_ATTEMPTS - 1) {
        throw error;
      }
      lastError = error;
      await delay(retryDelayMs(attempt));
      continue;
    }

    const bodyText = await response.text();
    if (response.ok) {
      return bodyText;
    }

    const error = new Error(`OpenAI request failed with ${response.status}: ${bodyText}`);
    if (!RETRYABLE_OPENAI_STATUSES.has(response.status) || attempt === MAX_OPENAI_ATTEMPTS - 1) {
      throw error;
    }

    lastError = error;
    await delay(retryDelayMs(attempt));
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

export const callOpenAi = async <ToolName extends string>(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly messages: readonly ChatMessage<ToolName>[];
  readonly tools: readonly unknown[];
  readonly toolNames: ReadonlySet<ToolName>;
  readonly maxCompletionTokens?: number;
}): Promise<{ readonly content: string; readonly toolCalls: readonly ToolCall<ToolName>[] }> => {
  const bodyText = await fetchOpenAiChatCompletion({
    apiKey: input.apiKey,
    body: {
      model: input.model,
      messages: input.messages,
      ...(input.tools.length === 0
        ? {}
        : {
            tools: input.tools,
            tool_choice: "auto",
          }),
      max_completion_tokens: input.maxCompletionTokens ?? 1_200,
    },
  });

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
    ? message.tool_calls.filter((toolCall): toolCall is ToolCall<ToolName> => {
        if (!isRecord(toolCall)) {
          return false;
        }
        const candidateFunction = toolCall.function;
        return (
          typeof toolCall.id === "string" &&
          toolCall.type === "function" &&
          isRecord(candidateFunction) &&
          typeof candidateFunction.name === "string" &&
          input.toolNames.has(candidateFunction.name as ToolName) &&
          typeof candidateFunction.arguments === "string"
        );
      })
    : [];

  return { content, toolCalls };
};
