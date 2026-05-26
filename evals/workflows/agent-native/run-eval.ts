import { createEvalArtifactWriter } from "../../harness/artifacts.ts";
import { printFailedExecutions, printFinalAnswer } from "../../harness/reporter.ts";
import { runWorkflowScenario } from "./scenario-runner.ts";
import { workflowScenarios } from "./scenarios.ts";

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the agent-native workflow eval.");
}

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "workflow-agent-native" });

console.log(
  `Running ${workflowScenarios.length} agent-native workflow eval scenario(s) with ${model}.`,
);
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of workflowScenarios) {
  const result = await runWorkflowScenario({
    scenario,
    model,
    openAiApiKey,
  });

  const metrics = `tools=${result.metrics.toolCallCount}, failedTools=${result.metrics.failedToolCallCount}, retryLike=${result.metrics.retryLikeToolCallCount}, runtimeMs=${result.metrics.runtimeMs}, stdoutBytes=${result.metrics.stdoutUtf8Bytes}, stdoutChars=${result.metrics.stdoutJsonCharacters}`;

  const artifactPath = await artifacts.writeScenario(scenario.id, {
    suite: "workflow-agent-native",
    model,
    result,
  });

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description} (${metrics}, ${artifactPath})`);
    continue;
  }

  failed += 1;
  console.error(
    `✗ ${scenario.id}: ${result.reasons.join("; ")} (${metrics}, ${artifactPath})`,
  );
  printFailedExecutions(result.toolExecutions);
  printFinalAnswer(result.finalAnswer);
}

if (failed > 0) {
  console.error(`\n${failed} agent-native workflow eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${workflowScenarios.length} agent-native workflow eval scenario(s) passed.`);
}
