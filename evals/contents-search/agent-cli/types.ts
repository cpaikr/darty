import type { ContentsSearchCliScenario } from "../cli-scenarios.ts";

export type AgentCliToolName = "run_darty_cli";

export type ToolCall = {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: AgentCliToolName;
    readonly arguments: string;
  };
};

export type ChatMessage =
  | { readonly role: "system" | "user"; readonly content: string }
  | {
      readonly role: "assistant";
      readonly content: string | null;
      readonly tool_calls?: readonly ToolCall[];
    }
  | { readonly role: "tool"; readonly tool_call_id: string; readonly content: string };

export type ToolExecution = {
  readonly toolName: AgentCliToolName;
  readonly input: unknown;
  readonly display: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly rejected?: string;
};

export type ScenarioRunResult = {
  readonly scenario: ContentsSearchCliScenario;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution[];
};
