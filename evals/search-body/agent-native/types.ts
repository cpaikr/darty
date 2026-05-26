import type { DartyAgentToolName } from "../../../src/app/agent-tools.ts";
import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";

export type AgentNativeToolName = DartyAgentToolName;

import type {
  ChatMessage as HarnessChatMessage,
  ToolCall as HarnessToolCall,
  ToolExecution as HarnessToolExecution,
} from "../../harness/tool-trace.ts";

export type ToolCall = HarnessToolCall<AgentNativeToolName>;
export type ChatMessage = HarnessChatMessage<AgentNativeToolName>;
export type ToolExecution = HarnessToolExecution<AgentNativeToolName>;

export type ScenarioRunResult = {
  readonly scenario: SearchBodyCliScenario;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution[];
};
