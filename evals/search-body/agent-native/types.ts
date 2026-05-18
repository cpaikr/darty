import type { DartyAgentToolName } from "../../../src/app/agent-tools.ts";
import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";

export type AgentNativeToolName = DartyAgentToolName;

export type ToolCall = {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: AgentNativeToolName;
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
  readonly toolName: AgentNativeToolName;
  readonly input: unknown;
  readonly display: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly rejected?: string;
};

export type ScenarioRunResult = {
  readonly scenario: SearchBodyCliScenario;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution[];
};
