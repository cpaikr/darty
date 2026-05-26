import { createDartyPiTool } from "../../../src/pi.ts";
import { toTruncatedToolMessageContent, truncate } from "../../harness/tool-trace.ts";
import { isRecord } from "../../harness/json.ts";
import type { ToolCall, ToolExecution } from "../../harness/tool-trace.ts";

export type PiToolName = "darty";
export type PiToolCall = ToolCall<PiToolName>;
export type PiToolExecution = ToolExecution<PiToolName>;

const piTool = createDartyPiTool();

export const piSingleToolDefinitions = [
  {
    type: "function",
    function: {
      name: piTool.name,
      description: `${piTool.description}\n\n${piTool.promptSnippet}\n${piTool.promptGuidelines.join("\n")}`,
      parameters: piTool.parameters,
    },
  },
] as const;

const parseToolArguments = (toolCall: PiToolCall): unknown =>
  JSON.parse(toolCall.function.arguments);

const rejectToolCall = (input: unknown, reason: string): PiToolExecution => ({
  toolName: "darty",
  input,
  display: "darty",
  exitCode: 126,
  stdout: "",
  stderr: reason,
  rejected: reason,
});

const display = (input: unknown): string =>
  isRecord(input)
    ? `darty(${JSON.stringify({
        action: input.action,
        command: input.command,
        inputJson: input.inputJson,
      })})`
    : `darty(${JSON.stringify(input)})`;

export const executePiSingleToolCall = async (
  toolCall: PiToolCall,
): Promise<PiToolExecution> => {
  let input: unknown;
  try {
    input = parseToolArguments(toolCall);
  } catch (error) {
    return rejectToolCall(
      toolCall.function.arguments,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!isRecord(input)) {
    return rejectToolCall(input, "arguments must be an object");
  }

  try {
    const result = await piTool.execute(toolCall.id, input as never);
    const ok = isRecord(result.details) && result.details.ok === true;

    return {
      toolName: "darty",
      input,
      display: display(input),
      exitCode: ok ? 0 : 1,
      stdout: JSON.stringify(result.details),
      stderr: ok ? "" : truncate(JSON.stringify(result.details), 4_000),
    };
  } catch (error) {
    return {
      toolName: "darty",
      input,
      display: display(input),
      exitCode: 1,
      stdout: "",
      stderr: truncate(error instanceof Error ? error.message : String(error), 4_000),
    };
  }
};

export const toPiToolMessageContent = toTruncatedToolMessageContent;
