import { runModelToolLoop } from "../harness/model-loop.ts";
import { modelToolView, toWorkflowToolMessageContent } from "../harness/tool-trace.ts";
import { collectWorkflowFacts, evaluateWorkflowTrace } from "./agent-assertions.ts";
import { agentWorkflowScenarios, type AgentWorkflowScenario } from "./agent-scenarios.ts";
import {
  judgeFinalAnswer,
  extractFinalAnswerCitations,
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
    toToolMessageContent: toWorkflowToolMessageContent,
  });

  const facts = collectWorkflowFacts(loop.toolExecutions, []);
  const finalAnswerCitations = validateFinalAnswerCitations({
    scenario: input.scenario, facts, finalAnswer: loop.finalAnswer,
  });
  const trace = evaluateWorkflowTrace(input.scenario, loop.toolExecutions, extractFinalAnswerCitations(loop.finalAnswer));
  const finalAnswerJudge =
    loop.termination === "final-response" && trace.pass && finalAnswerCitations.pass
      ? await judgeFinalAnswer({
          apiKey: input.openAiApiKey,
          model: input.judgeModel,
          scenario: input.scenario,
          facts: trace.facts,
          finalAnswer: loop.finalAnswer,
        })
      : skippedFinalAnswerJudge(
          loop.termination !== "final-response"
            ? `final-answer judge skipped because model loop ended with ${loop.termination}`
            : trace.pass
            ? "final-answer judge skipped because deterministic citation membership criteria failed"
            : "final-answer judge skipped because deterministic workflow trace criteria failed",
        );

  const reasons = [
    ...(loop.termination === "final-response" ? [] : [`model loop ${loop.termination}: ${loop.error ?? "no final answer"}`]),
    ...trace.reasons,
    ...finalAnswerCitations.reasons,
    ...finalAnswerJudge.reasons,
  ];

  const diagnostics = {
    executionFailures: loop.toolExecutions.flatMap((execution, operationIndex) => execution.exitCode === 0 ? [] : [{
      operationIndex, category: execution.rejected === undefined ? "cli-source-failure" : "wrapper-rejection", exitCode: execution.exitCode,
    }]),
    evidenceLimitations: loop.toolExecutions.flatMap((execution, operationIndex) => modelToolView(execution).limitations.map(reason => ({ operationIndex, reason }))),
    loopOutcome: loop.termination,
    taskProvenance: { pass: trace.pass, reasons: trace.reasons },
    citationMembership: finalAnswerCitations,
    judging: finalAnswerJudge.status,
  };
  return {
    diagnostics,
    scenario: input.scenario,
    loop,
    pass: loop.termination === "final-response" && trace.pass && finalAnswerCitations.pass && finalAnswerJudge.pass,
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
