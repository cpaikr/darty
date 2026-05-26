import { dartyAgentToolNames } from "../../../src/app/agent-tools.ts";
import { runModelToolLoop } from "../../harness/model-loop.ts";
import {
  agentNativeTools,
  executeAgentNativeToolCall,
  toAgentNativeToolMessageContent,
} from "../../search-body/agent-native/tools.ts";
import type {
  AgentNativeToolName,
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
  const startedAt = performance.now();
  const loop = await runModelToolLoop<AgentNativeToolName>({
    openAiApiKey: input.openAiApiKey,
    model: input.model,
    systemPrompt: `You are an assistant with access to typed local darty tools.

Use the darty_* tools when the user's request requires live DART data. Chain tools when an identifier from one result is needed by the next call. Do not guess company codes, filing identifiers, viewer URLs, document IDs, section IDs, or no-result answers.`,
    userPrompt: input.scenario.task,
    tools: agentNativeTools,
    toolNames: new Set(dartyAgentToolNames),
    maxTurns: 8,
    executeToolCall: executeAgentNativeToolCall,
    toToolMessageContent: toAgentNativeToolMessageContent,
  });

  const runtimeMs = Math.round(performance.now() - startedAt);
  const reasons = evaluateWorkflowInvocation(input.scenario, loop.toolExecutions, {
    finalAnswer: loop.finalAnswer,
  });

  return {
    scenario: input.scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
    metrics: buildMetrics(runtimeMs, loop.toolExecutions),
  };
};
