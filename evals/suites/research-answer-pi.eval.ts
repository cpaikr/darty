import { dartySingleToolCopy } from "../../src/toolset.ts";
import { createEvalArtifactWriter } from "../harness/artifacts.ts";
import { runModelToolLoop } from "../harness/model-loop.ts";
import { printFailedExecutions, printFinalAnswer } from "../harness/reporter.ts";
import { judgeFinalAnswer } from "../judges/final-answer-judge.ts";
import { researchAnswerScenarios } from "../scenarios/research-answers.ts";
import { evaluatePiWorkflowInvocation } from "../surfaces/pi/assertions.ts";
import {
  executePiSingleToolCall,
  piSingleToolDefinitions,
  toPiToolMessageContent,
  type PiToolName,
} from "../surfaces/pi/pi-single-tool.ts";

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const judgeModel = process.env.OPENAI_JUDGE_MODEL ?? model;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the Pi research-answer eval.");
}

const DART_REFERENCE_PATTERN = /(?:dart\.fss\.or\.kr|rcpNo\s*=\s*20\d{12}|\b20\d{12}\b|section|문서|보고서|출처)/iu;
const URL_ONLY_PATTERN = /^\s*(?:https?:\/\/\S+|20\d{12})\s*$/u;

const deterministicAnswerReasons = (finalAnswer: string): readonly string[] => {
  const reasons: string[] = [];
  if (finalAnswer.trim().length === 0) {
    reasons.push("agent did not produce a final answer");
  }
  if (URL_ONLY_PATTERN.test(finalAnswer.trim())) {
    reasons.push("final answer only returned a filing URL or receipt number");
  }
  if (!DART_REFERENCE_PATTERN.test(finalAnswer)) {
    reasons.push("final answer did not cite a returned DART reference or section");
  }
  return reasons;
};

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "research-answer-pi" });

console.log(
  `Running ${researchAnswerScenarios.length} Pi research-answer eval scenario(s) with ${model}; judge=${judgeModel}.`,
);
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of researchAnswerScenarios) {
  const loop = await runModelToolLoop<PiToolName>({
    openAiApiKey,
    model,
    systemPrompt: `You are an assistant with access to the public Darty Pi single tool.\n\n${dartySingleToolCopy.promptSnippet}\n${dartySingleToolCopy.promptGuidelines.join("\n")}\n\nFor research questions, retrieve DART evidence, answer the user's actual question, cite returned evidence, and say when evidence is insufficient. Do not give investment, legal, or accounting advice.`,
    userPrompt: scenario.task,
    tools: piSingleToolDefinitions,
    toolNames: new Set(["darty"]),
    maxTurns: 14,
    executeToolCall: executePiSingleToolCall,
    toToolMessageContent: toPiToolMessageContent,
  });

  const deterministicReasons = [
    ...evaluatePiWorkflowInvocation(scenario.trace, loop.toolExecutions, {
      finalAnswer: loop.finalAnswer,
    }),
    ...deterministicAnswerReasons(loop.finalAnswer),
  ];
  const judge = await judgeFinalAnswer({
    apiKey: openAiApiKey,
    model: judgeModel,
    userTask: scenario.task,
    judgeFocus: scenario.judgeFocus,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
  });
  const reasons = [
    ...deterministicReasons,
    ...(judge.pass ? [] : judge.reasons.map((reason) => `judge: ${reason}`)),
  ];
  const result = {
    scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
    judge,
  };
  const artifactPath = await artifacts.writeScenario(scenario.id, {
    suite: "research-answer-pi",
    model,
    judgeModel,
    result,
  });

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description} (judge=${judge.score}, ${artifactPath})`);
    continue;
  }

  failed += 1;
  console.error(
    `✗ ${scenario.id}: ${reasons.join("; ")} (judge=${judge.score}, ${artifactPath})`,
  );
  printFailedExecutions(loop.toolExecutions);
  printFinalAnswer(loop.finalAnswer);
}

if (failed > 0) {
  console.error(`\n${failed} Pi research-answer eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${researchAnswerScenarios.length} Pi research-answer eval scenario(s) passed.`);
}
