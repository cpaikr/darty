export type ToolCall<ToolName extends string = string> = {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: ToolName;
    readonly arguments: string;
  };
};

export type ChatMessage<ToolName extends string = string> =
  | { readonly role: "system" | "user"; readonly content: string }
  | {
      readonly role: "assistant";
      readonly content: string | null;
      readonly tool_calls?: readonly ToolCall<ToolName>[];
    }
  | { readonly role: "tool"; readonly tool_call_id: string; readonly content: string };

export type ToolExecution<ToolName extends string = string> = {
  readonly toolName: ToolName;
  readonly input: unknown;
  readonly display: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly rejected?: string;
};

export const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...<truncated>`;

export const toTruncatedToolMessageContent = <ToolName extends string>(
  execution: ToolExecution<ToolName>,
): string =>
  JSON.stringify({
    ...execution,
    stdout: truncate(execution.stdout, 16_000),
    stderr: truncate(execution.stderr, 4_000),
  });
