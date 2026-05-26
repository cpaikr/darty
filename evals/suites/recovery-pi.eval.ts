import { dartySingleToolCopy } from "../../src/toolset.ts";
import { createEvalArtifactWriter } from "../harness/artifacts.ts";
import { runModelToolLoop } from "../harness/model-loop.ts";
import { printFailedExecutions, printFinalAnswer } from "../harness/reporter.ts";
import { recoveryScenarios } from "../scenarios/recovery.ts";
import { evaluatePiRecoveryInvocation } from "../surfaces/pi/assertions.ts";
import {
  executePiSingleToolCall,
  piSingleToolDefinitions,
  toPiToolMessageContent,
  type PiToolName,
} from "../surfaces/pi/pi-single-tool.ts";

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the Pi recovery eval.");
}

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "recovery-pi" });

console.log(
  `Running ${recoveryScenarios.length} Pi single-tool recovery eval scenario(s) with ${model}.`,
);
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of recoveryScenarios) {
  const loop = await runModelToolLoop<PiToolName>({
    openAiApiKey,
    model,
    systemPrompt: `You are an assistant with access to the public Darty Pi single tool.\n\n${dartySingleToolCopy.promptSnippet}\n${dartySingleToolCopy.promptGuidelines.join("\n")}\n\nWhen the user asks you to validate, call action=validate before action=run. If validation fails, use returned recovery metadata or command_help to repair the input and try again.`,
    userPrompt: scenario.task,
    tools: piSingleToolDefinitions,
    toolNames: new Set(["darty"]),
    maxTurns: 10,
    executeToolCall: executePiSingleToolCall,
    toToolMessageContent: toPiToolMessageContent,
  });
  const reasons = evaluatePiRecoveryInvocation({
    toolExecutions: loop.toolExecutions,
    finalAnswer: loop.finalAnswer,
  });
  const result = {
    scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
  };
  const artifactPath = await artifacts.writeScenario(scenario.id, {
    suite: "recovery-pi",
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
  console.error(`\n${failed} Pi single-tool recovery eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${recoveryScenarios.length} Pi single-tool recovery eval scenario(s) passed.`);
}
