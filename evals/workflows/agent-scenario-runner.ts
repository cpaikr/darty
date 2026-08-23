import { runModelToolLoop } from "../harness/model-loop.ts";
import { toTruncatedToolMessageContent } from "../harness/tool-trace.ts";
import { evaluateWorkflowTrace } from "./agent-assertions.ts";
import { agentWorkflowScenarios, type AgentWorkflowScenario } from "./agent-scenarios.ts";
import {
  judgeFinalAnswer,
  skippedFinalAnswerJudge,
  validateFinalAnswerCitations,
} from "./final-answer-judge.ts";
import {
  executeWorkflowToolCall,
  workflowAgentTools,
} from "./agent-tools.ts";
import type {
  AgentWorkflowScenarioRunResult,
  WorkflowToolName,
} from "./agent-types.ts";

const workflowSystemPrompt = `You are an assistant with access to a local darty CLI runner. Use run_darty_cli for every live DART lookup. Follow references returned by earlier calls: resolve the company code, select filing receiptNumbers from search results, fetch each report's TOC, and use only section IDs returned by that report's TOC. Do not guess identifiers, URLs, or filing facts. After the evidence is sufficient, answer the user's research request and include exact receiptNumber + sectionId citations.`;

export const runAgentWorkflowScenario = async (input: {
  readonly scenario: AgentWorkflowScenario;
  readonly repoRoot: string;
  readonly model: string;
  readonly judgeModel: string;
  readonly openAiApiKey: string;
}): Promise<AgentWorkflowScenarioRunResult> => {
  const loop = await runModelToolLoop<WorkflowToolName>({
    openAiApiKey: input.openAiApiKey,
    model: input.model,
    systemPrompt: workflowSystemPrompt,
    userPrompt: input.scenario.task,
    tools: workflowAgentTools,
    toolNames: new Set(["run_darty_cli"]),
    maxTurns: 10,
    executeToolCall: (toolCall) => executeWorkflowToolCall(input.repoRoot, toolCall),
    toToolMessageContent: toTruncatedToolMessageContent,
  });

  const trace = evaluateWorkflowTrace(input.scenario, loop.toolExecutions);
  const finalAnswerCitations = trace.pass
    ? validateFinalAnswerCitations({
        scenario: input.scenario,
        facts: trace.facts,
        finalAnswer: loop.finalAnswer,
      })
    : {
        pass: false,
        reasons: [],
        citations: [],
      };
  const finalAnswerJudge =
    trace.pass && finalAnswerCitations.pass
      ? await judgeFinalAnswer({
          apiKey: input.openAiApiKey,
          model: input.judgeModel,
          scenario: input.scenario,
          facts: trace.facts,
          finalAnswer: loop.finalAnswer,
        })
      : skippedFinalAnswerJudge(
          trace.pass
            ? "final-answer judge skipped because deterministic citation membership criteria failed"
            : "final-answer judge skipped because deterministic workflow trace criteria failed",
        );

  const reasons = [
    ...trace.reasons,
    ...finalAnswerCitations.reasons,
    ...finalAnswerJudge.reasons,
  ];

  return {
    scenario: input.scenario,
    pass: trace.pass && finalAnswerJudge.pass,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
    trace,
    finalAnswerCitations,
    finalAnswerJudge,
  };
};

export const runAllAgentWorkflowScenarios = async (input: {
  readonly repoRoot: string;
  readonly model: string;
  readonly judgeModel: string;
  readonly openAiApiKey: string;
}): Promise<readonly AgentWorkflowScenarioRunResult[]> => {
  const results: AgentWorkflowScenarioRunResult[] = [];

  for (const scenario of agentWorkflowScenarios) {
    results.push(await runAgentWorkflowScenario({ ...input, scenario }));
  }

  return results;
};
