import { expect, test } from "bun:test";
import { runModelToolLoop } from "./model-loop.ts";
import type { ToolCall } from "./tool-trace.ts";

const call = (id: string): ToolCall<"cli"> => ({ id, type: "function", function: { name: "cli", arguments: "{}" } });
const base = {
  openAiApiKey: "fake-private-key", model: "fake", systemPrompt: "test", userPrompt: "test",
  tools: [{}], toolNames: new Set(["cli"] as const), maxTurns: 2,
  executeToolCall: async (toolCall: ToolCall<"cli">) => ({ toolName: "cli" as const, input: {}, display: toolCall.id, exitCode: 0, stdout: "observed", stderr: "" }),
  toToolMessageContent: () => "observed",
};
test("reserves one tool-free finalization response after multiple last-turn results", async () => {
  let count = 0;
  const result = await runModelToolLoop({ ...base, request: async input => {
    count++;
    if (count === 1) return { content: "", toolCalls: [call("one"), call("two")] };
    expect(input.tools).toEqual([]);
    expect(input.toolNames.size).toBe(0);
    expect(input.messages.filter(message => message.role === "tool")).toHaveLength(2);
    return { content: "The evidence supports the answer.", toolCalls: [] };
  } });
  expect(result.termination).toBe("final-response");
  expect(result.responseCount).toBe(2);
  expect(result.toolCallCount).toBe(2);
  expect(result.finalized).toBe(true);
});
test("does not execute tools after the finalization budget", async () => {
  const result = await runModelToolLoop({ ...base, request: async () => ({ content: "", toolCalls: [call("one")] }) });
  expect(result.termination).toBe("response-budget-exhaustion");
  expect(result.responseCount).toBe(2);
  expect(result.toolCallCount).toBe(1);
});
test("preserves partial traces and redacts credentials on request failure", async () => {
  let count = 0;
  const result = await runModelToolLoop({ ...base, request: async () => {
    if (count++ === 0) return { content: "", toolCalls: [call("one")] };
    throw new Error("request failed fake-private-key");
  } });
  expect(result.termination).toBe("request-failed");
  expect(result.responseCount).toBe(1);
  expect(result.toolCallCount).toBe(1);
  expect(result.error).toBe("request failed <redacted>");
});
test("reports tool execution exceptions separately", async () => {
  const result = await runModelToolLoop({ ...base,
    request: async () => ({ content: "", toolCalls: [call("one")] }),
    executeToolCall: async () => { throw new Error("spawn failed"); },
  });
  expect(result.termination).toBe("tool-failed");
  expect(result.toolCallCount).toBe(1);
  expect(result.responseCount).toBe(1);
});
test("an empty model response cannot be mistaken for a final answer", async () => {
  const result = await runModelToolLoop({ ...base, request: async () => ({ content: "", toolCalls: [] }) });
  expect(result.termination).toBe("response-budget-exhaustion");
});

test("an early empty response leaves the bounded finalization opportunity available", async () => {
  let calls = 0;
  const result = await runModelToolLoop({ ...base, request: async () => ({ content: calls++ === 0 ? "" : "Final evidence answer", toolCalls: [] }) });
  expect(result.termination).toBe("final-response");
  expect(result.responseCount).toBe(2);
  expect(result.finalized).toBe(true);
});
test("an invalid model response is counted and distinct from transport failure", async () => {
  const { ModelResponseError } = await import("./openai-chat.ts");
  const result = await runModelToolLoop({ ...base, request: async () => { throw new ModelResponseError("unexpected tool call"); } });
  expect(result.termination).toBe("invalid-response");
  expect(result.responseCount).toBe(1);
});
