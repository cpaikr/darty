import type {
  ChatMessage,
  ToolCall,
  ToolExecution,
} from "../harness/tool-trace.ts";
import type { AgentWorkflowScenario } from "./agent-scenarios.ts";

export type WorkflowToolName = "run_darty_cli";

export type WorkflowToolCall = ToolCall<WorkflowToolName>;
export type WorkflowChatMessage = ChatMessage<WorkflowToolName>;
export type WorkflowToolExecution = ToolExecution<WorkflowToolName>;

export type AgentWorkflowScenarioRunResult = {
  readonly diagnostics: {
    readonly executionFailures: readonly { operationIndex: number; category: string; exitCode: number }[];
    readonly evidenceLimitations: readonly { operationIndex: number; reason: string }[];
    readonly loopOutcome: string;
    readonly taskProvenance: { pass: boolean; reasons: readonly string[] };
    readonly citationMembership: import("./final-answer-judge.ts").FinalAnswerCitationAssertion;
    readonly judging: import("./final-answer-judge.ts").FinalAnswerJudgeResult["status"];
  };
  readonly loop: import("../harness/model-loop.ts").ModelLoopResult<WorkflowToolName>;
  readonly scenario: AgentWorkflowScenario;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly finalAnswer: string;
  readonly toolExecutions: readonly WorkflowToolExecution[];
  readonly trace: import("./agent-assertions.ts").WorkflowTraceAssertion;
  readonly finalAnswerCitations: import("./final-answer-judge.ts").FinalAnswerCitationAssertion;
  readonly finalAnswerJudge: import("./final-answer-judge.ts").FinalAnswerJudgeResult;
};
