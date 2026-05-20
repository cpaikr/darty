import { callOpenAi } from "../../search-body/agent-native/openai-chat.ts";
import {
  agentNativeTools,
  executeAgentNativeToolCall,
  toAgentNativeToolMessageContent,
} from "../../search-body/agent-native/tools.ts";
import type {
  ChatMessage,
  ToolExecution,
} from "../../search-body/agent-native/types.ts";
import { evaluateWorkflowInvocation } from "./invocation-assertions.ts";
import type { WorkflowScenario } from "./scenarios.ts";

export type WorkflowMetrics = {
  readonly runtimeMs: number;
  readonly toolCallCount: number;
  readonly failedToolCallCount: number;
  readonly retryLikeToolCallCount: number;
  readonly stdoutUtf8Bytes: number;
  readonly stdoutJsonCharacters: number;
};

export type WorkflowRunResult = {
  readonly scenario: WorkflowScenario;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution[];
  readonly metrics: WorkflowMetrics;
};

const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

const countRetryLikeToolCalls = (toolExecutions: readonly ToolExecution[]): number => {
  const seen = new Set<string>();
  let retryLikeCalls = 0;

  for (const execution of toolExecutions) {
    const key = `${execution.toolName}:${JSON.stringify(execution.input)}`;
    if (seen.has(key)) {
      retryLikeCalls += 1;
    } else {
      seen.add(key);
    }
  }

  return retryLikeCalls;
};

const buildMetrics = (
  runtimeMs: number,
  toolExecutions: readonly ToolExecution[],
): WorkflowMetrics => ({
  runtimeMs,
  toolCallCount: toolExecutions.length,
  failedToolCallCount: toolExecutions.filter((execution) => execution.exitCode !== 0)
    .length,
  retryLikeToolCallCount: countRetryLikeToolCalls(toolExecutions),
  stdoutUtf8Bytes: toolExecutions.reduce(
    (sum, execution) => sum + utf8Bytes(execution.stdout),
    0,
  ),
  stdoutJsonCharacters: toolExecutions.reduce(
    (sum, execution) => sum + execution.stdout.length,
    0,
  ),
});

export const runWorkflowScenario = async (input: {
  readonly scenario: WorkflowScenario;
  readonly model: string;
  readonly openAiApiKey: string;
}): Promise<WorkflowRunResult> => {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an assistant with access to typed local darty tools.

Use the darty_* tools when the user's request requires live DART data. Chain tools when an identifier from one result is needed by the next call. Do not guess company codes, filing identifiers, viewer URLs, document IDs, section IDs, or no-result answers.`,
    },
    { role: "user", content: input.scenario.task },
  ];
  const toolExecutions: ToolExecution[] = [];
  let finalAnswer = "";
  const startedAt = performance.now();

  for (let turn = 0; turn < 8; turn += 1) {
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

  const runtimeMs = Math.round(performance.now() - startedAt);
  const reasons = evaluateWorkflowInvocation(input.scenario, toolExecutions, {
    finalAnswer,
  });

  return {
    scenario: input.scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer,
    toolExecutions,
    metrics: buildMetrics(runtimeMs, toolExecutions),
  };
};
