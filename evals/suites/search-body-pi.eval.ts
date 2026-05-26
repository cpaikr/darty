import { dartySingleToolCopy } from "../../src/toolset.ts";
import { createEvalArtifactWriter } from "../harness/artifacts.ts";
import { runModelToolLoop } from "../harness/model-loop.ts";
import { printFailedExecutions, printFinalAnswer } from "../harness/reporter.ts";
import { searchBodyCliScenarios } from "../search-body/shared/cli-scenarios.ts";
import { evaluatePiSearchBodyInvocation } from "../surfaces/pi/assertions.ts";
import {
  executePiSingleToolCall,
  piSingleToolDefinitions,
  toPiToolMessageContent,
  type PiToolName,
} from "../surfaces/pi/pi-single-tool.ts";

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the Pi search-body eval.");
}

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "search-body-pi" });

console.log(
  `Running ${searchBodyCliScenarios.length} Pi single-tool search-body eval scenario(s) with ${model}.`,
);
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of searchBodyCliScenarios) {
  const loop = await runModelToolLoop<PiToolName>({
    openAiApiKey,
    model,
    systemPrompt: `You are an assistant with access to the public Darty Pi single tool.\n\n${dartySingleToolCopy.promptSnippet}\n${dartySingleToolCopy.promptGuidelines.join("\n")}`,
    userPrompt: scenario.prompts.pi,
    tools: piSingleToolDefinitions,
    toolNames: new Set(["darty"]),
    maxTurns: 8,
    executeToolCall: executePiSingleToolCall,
    toToolMessageContent: toPiToolMessageContent,
  });

  const reasons = evaluatePiSearchBodyInvocation(scenario, loop.toolExecutions);
  const result = {
    scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
  };
  const artifactPath = await artifacts.writeScenario(scenario.id, {
    suite: "search-body-pi",
    model,
    result,
  });

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description} (${artifactPath})`);
    continue;
  }

  failed += 1;
  console.error(`✗ ${scenario.id}: ${reasons.join("; ")} (${artifactPath})`);
  printFailedExecutions(loop.toolExecutions);
  printFinalAnswer(loop.finalAnswer);
}

if (failed > 0) {
  console.error(`\n${failed} Pi single-tool search-body eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(
    `\n${searchBodyCliScenarios.length} Pi single-tool search-body eval scenario(s) passed.`,
  );
}
