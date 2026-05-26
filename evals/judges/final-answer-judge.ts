import { callOpenAi } from "../harness/openai-chat.ts";
import { truncate } from "../harness/tool-trace.ts";
import { parseJsonObject } from "../harness/json.ts";
import { finalAnswerJudgeRubric } from "./rubrics.ts";
import type { PiToolExecution } from "../surfaces/pi/pi-single-tool.ts";

export type FinalAnswerJudgeResult = {
  readonly pass: boolean;
  readonly score: number;
  readonly reasons: readonly string[];
};

const evidenceSummary = (toolExecutions: readonly PiToolExecution[]): string =>
  toolExecutions
    .map((execution, index) =>
      [
        `# Tool execution ${index + 1}`,
        `display: ${execution.display}`,
        `exitCode: ${execution.exitCode}`,
        `stdout: ${truncate(execution.stdout, 6_000)}`,
        execution.stderr.length > 0 ? `stderr: ${truncate(execution.stderr, 1_000)}` : undefined,
      ]
        .filter((line): line is string => line !== undefined)
        .join("\n"),
    )
    .join("\n\n");

const parseJudgeResult = (content: string): FinalAnswerJudgeResult => {
  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonObject(content);
  } catch (error) {
    return {
      pass: false,
      score: 0,
      reasons: [
        `Judge did not return parseable JSON: ${error instanceof Error ? error.message : String(error)}`,
        `Raw judge response: ${truncate(content, 1_000)}`,
      ],
    };
  }

  const score = typeof parsed.score === "number" ? parsed.score : 0;
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((reason): reason is string => typeof reason === "string")
    : ["Judge did not return string reasons."];

  return {
    pass: parsed.pass === true && score >= finalAnswerJudgeRubric.passingScore,
    score,
    reasons,
  };
};

export const judgeFinalAnswer = async (input: {
  readonly apiKey: string;
  readonly model: string;
  readonly userTask: string;
  readonly judgeFocus: string;
  readonly finalAnswer: string;
  readonly toolExecutions: readonly PiToolExecution[];
}): Promise<FinalAnswerJudgeResult> => {
  const response = await callOpenAi<never>({
    apiKey: input.apiKey,
    model: input.model,
    toolNames: new Set<never>(),
    tools: [],
    messages: [
      {
        role: "system",
        content: `You are a strict evaluator for DART research-answer evals. Return only JSON with this shape: {"pass": boolean, "score": number, "reasons": string[]}.

Rubric version: ${finalAnswerJudgeRubric.version}
Passing score: ${finalAnswerJudgeRubric.passingScore}/5
Criteria:
${finalAnswerJudgeRubric.criteria.map((criterion) => `- ${criterion}`).join("\n")}`,
      },
      {
        role: "user",
        content: `User task:\n${input.userTask}\n\nScenario focus:\n${input.judgeFocus}\n\nTool evidence:\n${evidenceSummary(input.toolExecutions)}\n\nFinal answer to judge:\n${input.finalAnswer}`,
      },
    ],
  });

  return parseJudgeResult(response.content);
};
