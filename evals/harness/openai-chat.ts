import type { ChatMessage, ToolCall } from "./tool-trace.ts";
import { isRecord } from "./json.ts";

const RETRYABLE_OPENAI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
export const MAX_OPENAI_ATTEMPTS = 4;
export const OPENAI_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_OPENAI_RETRY_DELAY_MS = 10_000;
const OPENAI_RETRY_BASE_DELAY_MS = 750;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const parseRetryAfterMs = (
  header: string | null,
  nowMs = Date.now(),
): number | undefined => {
  if (header === null) {
    return undefined;
  }

  const value = header.trim();
  if (/^\d+(?:\.\d+)?$/u.test(value)) {
    return Math.min(
      MAX_OPENAI_RETRY_DELAY_MS,
      Math.ceil(Number(value) * 1_000),
    );
  }

  const retryAtMs = Date.parse(value);
  if (!Number.isFinite(retryAtMs)) {
    return undefined;
  }

  return Math.min(
    MAX_OPENAI_RETRY_DELAY_MS,
    Math.max(0, retryAtMs - nowMs),
  );
};

export const openAiRetryDelayMs = (
  attempt: number,
  retryAfterHeader: string | null = null,
  nowMs = Date.now(),
): number =>
  Math.min(
    MAX_OPENAI_RETRY_DELAY_MS,
    parseRetryAfterMs(retryAfterHeader, nowMs) ??
      OPENAI_RETRY_BASE_DELAY_MS * 2 ** attempt,
  );

type OpenAiResponse = {
  readonly response: Response;
  readonly bodyText: string;
};

const fetchOpenAiResponse = async (input: {
  readonly apiKey: string;
  readonly body: unknown;
  readonly timeoutMs: number;
}): Promise<OpenAiResponse> => {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, input.timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    return { response, bodyText };
  } catch (error) {
    if (timedOut) {
      throw new Error(`OpenAI request timed out after ${input.timeoutMs}ms.`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchOpenAiChatCompletion = async (input: {
  readonly apiKey: string;
  readonly body: unknown;
  readonly requestTimeoutMs?: number;
  readonly maxAttempts?: number;
}): Promise<string> => {
  let lastError: unknown;
  const requestTimeoutMs = input.requestTimeoutMs ?? OPENAI_REQUEST_TIMEOUT_MS;
  const maxAttempts = input.maxAttempts ?? MAX_OPENAI_ATTEMPTS;
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error("OpenAI requestTimeoutMs must be a positive integer.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new Error("OpenAI maxAttempts must be a positive integer.");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let attemptResponse: OpenAiResponse;
    try {
      attemptResponse = await fetchOpenAiResponse({
        apiKey: input.apiKey,
        body: input.body,
        timeoutMs: requestTimeoutMs,
      });
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      lastError = error;
      await delay(openAiRetryDelayMs(attempt));
      continue;
    }

    const { response, bodyText } = attemptResponse;
    if (response.ok) {
      return bodyText;
    }

    const error = new Error(`OpenAI request failed with ${response.status}: ${bodyText}`);
    if (!RETRYABLE_OPENAI_STATUSES.has(response.status) || attempt === maxAttempts - 1) {
      throw error;
    }

    lastError = error;
    await delay(openAiRetryDelayMs(attempt, response.headers.get("retry-after")));
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
  if (message.tool_calls !== undefined && !Array.isArray(message.tool_calls)) {
    throw new Error("OpenAI response contained malformed tool calls.");
  }
  const toolCalls: ToolCall<ToolName>[] = [];
  for (const toolCall of Array.isArray(message.tool_calls) ? message.tool_calls : []) {
    if (!isRecord(toolCall) || typeof toolCall.id !== "string" || toolCall.type !== "function" ||
        !isRecord(toolCall.function) || typeof toolCall.function.name !== "string" ||
        !input.toolNames.has(toolCall.function.name as ToolName) || typeof toolCall.function.arguments !== "string") {
      throw new Error("OpenAI response contained a malformed or unavailable tool call.");
    }
    toolCalls.push(toolCall as unknown as ToolCall<ToolName>);
  }
  return { content, toolCalls };
};
