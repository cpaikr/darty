import {
  dartyAgentToolDefinitions,
  executeDartyAgentTool,
} from "../../../src/app/agent-tools.ts";
import type { AgentNativeToolName, ToolCall, ToolExecution } from "./types.ts";

export const agentNativeTools = dartyAgentToolDefinitions;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...<truncated>`;

const parseToolArguments = (toolCall: ToolCall): unknown =>
  JSON.parse(toolCall.function.arguments);

const rejectToolCall = (
  toolName: AgentNativeToolName,
  input: unknown,
  reason: string,
): ToolExecution => ({
  toolName,
  input,
  display: toolName,
  exitCode: 126,
  stdout: "",
  stderr: reason,
  rejected: reason,
});

export const executeAgentNativeToolCall = async (
  toolCall: ToolCall,
): Promise<ToolExecution> => {
  let input: unknown;
  try {
    input = parseToolArguments(toolCall);
  } catch (error) {
    return rejectToolCall(
      toolCall.function.name,
      toolCall.function.arguments,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!isRecord(input)) {
    return rejectToolCall(toolCall.function.name, input, "arguments must be an object");
  }

  try {
    const result = await executeDartyAgentTool(toolCall.function.name, input);

    return {
      toolName: toolCall.function.name,
      input,
      display: `${toolCall.function.name}(${JSON.stringify(input)})`,
      exitCode: 0,
      stdout: truncate(JSON.stringify(result), 16_000),
      stderr: "",
    };
  } catch (error) {
    return {
      toolName: toolCall.function.name,
      input,
      display: `${toolCall.function.name}(${JSON.stringify(input)})`,
      exitCode: 1,
      stdout: "",
      stderr: truncate(error instanceof Error ? error.message : String(error), 4_000),
    };
  }
};
