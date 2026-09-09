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

export const MODEL_BODY_CHAR_LIMIT = 12_000;
export const MODEL_STDOUT_CHAR_LIMIT = 64_000;

// Keep envelopes parseable; only body strings may be shortened. Oversized metadata
// is an explicit unavailable view, never a partial JSON document.
export const modelToolView = (execution: ToolExecution): { stdout: string; limitations: string[] } => {
  const limitations: string[] = [];
  let stdout = execution.stdout;
  try {
    const value: unknown = JSON.parse(stdout);
    stdout = JSON.stringify(value, (_key, child: unknown) => {
      if (typeof child !== "object" || child === null || Array.isArray(child)) return child;
      const record = child as Record<string, unknown>;
      if (typeof record.body !== "string" || record.body.length <= MODEL_BODY_CHAR_LIMIT) return child;
      let body = record.body.slice(0, MODEL_BODY_CHAR_LIMIT);
      // Do not split an astral character at the projection boundary.
      if (/[\uD800-\uDBFF]$/u.test(body)) body = body.slice(0, -1);
      const window = record.window as { startByte?: unknown } | undefined;
      const startByte = typeof window?.startByte === "number" ? window.startByte : undefined;
      const nextStartByte = startByte === undefined ? undefined : startByte + new TextEncoder().encode(body).length;
      limitations.push(`body truncated to first ${body.length} characters of returned window (${record.body.length} available); ${nextStartByte === undefined ? "request a smaller content window" : "continue at modelView.nextStartByte to read omitted content"}`);
      return { ...record, body, modelView: {
        bodyCharacters: body.length, sourceBodyCharacters: record.body.length,
        ...(nextStartByte === undefined ? {} : { unit: "utf8-bytes", startByte, endByte: nextStartByte, nextStartByte }),
      } };
    });
  } catch {
    // Help and failed CLI diagnostics are text, not JSON evidence.
  }
  if (stdout.length > MODEL_STDOUT_CHAR_LIMIT) {
    limitations.push(`stdout exceeds ${MODEL_STDOUT_CHAR_LIMIT}-character model view budget; evidence unavailable`);
    stdout = JSON.stringify({ evidenceUnavailable: true, reason: limitations.at(-1) });
  }
  return { stdout, limitations };
};

export const toWorkflowToolMessageContent = (execution: ToolExecution): string =>
  JSON.stringify({ ...execution, ...modelToolView(execution), stderr: truncate(execution.stderr, 4_000) });
