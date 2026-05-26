import { dartySingleToolCopy } from "../../src/toolset.ts";
import { createEvalArtifactWriter } from "../harness/artifacts.ts";
import { runModelToolLoop } from "../harness/model-loop.ts";
import { printFailedExecutions, printFinalAnswer } from "../harness/reporter.ts";
import { workflowScenarios } from "../scenarios/filing-workflows.ts";
import { evaluatePiWorkflowInvocation } from "../surfaces/pi/assertions.ts";
import {
  executePiSingleToolCall,
  piSingleToolDefinitions,
  toPiToolMessageContent,
  type PiToolName,
} from "../surfaces/pi/pi-single-tool.ts";

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the Pi workflow eval.");
}

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "workflow-pi" });

console.log(
  `Running ${workflowScenarios.length} Pi single-tool workflow eval scenario(s) with ${model}.`,
);
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of workflowScenarios) {
  const startedAt = performance.now();
  const loop = await runModelToolLoop<PiToolName>({
    openAiApiKey,
    model,
    systemPrompt: `You are an assistant with access to the public Darty Pi single tool.\n\n${dartySingleToolCopy.promptSnippet}\n${dartySingleToolCopy.promptGuidelines.join("\n")}\n\nUse action=help or action=command_help when you need command names or input schemas. Chain identifiers returned by one Darty run into the next run.`,
    userPrompt: scenario.task,
    tools: piSingleToolDefinitions,
    toolNames: new Set(["darty"]),
    maxTurns: 12,
    executeToolCall: executePiSingleToolCall,
    toToolMessageContent: toPiToolMessageContent,
  });
  const runtimeMs = Math.round(performance.now() - startedAt);
  const reasons = evaluatePiWorkflowInvocation(scenario, loop.toolExecutions, {
    finalAnswer: loop.finalAnswer,
  });
  const metrics = `tools=${loop.toolExecutions.length}, failedTools=${loop.toolExecutions.filter((execution) => execution.exitCode !== 0).length}, runtimeMs=${runtimeMs}`;
  const result = {
    scenario,
    pass: reasons.length === 0,
    reasons,
    finalAnswer: loop.finalAnswer,
    toolExecutions: loop.toolExecutions,
    metrics: { runtimeMs, toolCallCount: loop.toolExecutions.length },
  };
  const artifactPath = await artifacts.writeScenario(scenario.id, {
    suite: "workflow-pi",
    model,
    result,
  });

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description} (${metrics}, ${artifactPath})`);
    continue;
  }

  failed += 1;
  console.error(`✗ ${scenario.id}: ${reasons.join("; ")} (${metrics}, ${artifactPath})`);
  printFailedExecutions(loop.toolExecutions);
  printFinalAnswer(loop.finalAnswer);
}

if (failed > 0) {
  console.error(`\n${failed} Pi single-tool workflow eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${workflowScenarios.length} Pi single-tool workflow eval scenario(s) passed.`);
}
