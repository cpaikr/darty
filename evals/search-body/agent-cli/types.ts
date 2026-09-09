import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";

export type AgentCliToolName = "run_darty_cli";

import type {
  ChatMessage as HarnessChatMessage,
  ToolCall as HarnessToolCall,
  ToolExecution as HarnessToolExecution,
} from "../../harness/tool-trace.ts";

export type ToolCall = HarnessToolCall<AgentCliToolName>;
export type ChatMessage = HarnessChatMessage<AgentCliToolName>;
export type ToolExecution = HarnessToolExecution<AgentCliToolName>;

export type ScenarioRunResult = {
  readonly loop: import("../../harness/model-loop.ts").ModelLoopResult<AgentCliToolName>;
  readonly scenario: SearchBodyCliScenario;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution[];
};
