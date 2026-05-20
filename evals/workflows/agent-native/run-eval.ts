import { runWorkflowScenario } from "./scenario-runner.ts";
import { workflowScenarios } from "./scenarios.ts";

const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the agent-native workflow eval.");
}

let failed = 0;

console.log(
  `Running ${workflowScenarios.length} agent-native workflow eval scenario(s) with ${model}.`,
);

for (const scenario of workflowScenarios) {
  const result = await runWorkflowScenario({
    scenario,
    model,
    openAiApiKey,
  });

  const metrics = `tools=${result.metrics.toolCallCount}, failedTools=${result.metrics.failedToolCallCount}, retryLike=${result.metrics.retryLikeToolCallCount}, runtimeMs=${result.metrics.runtimeMs}, stdoutBytes=${result.metrics.stdoutUtf8Bytes}, stdoutChars=${result.metrics.stdoutJsonCharacters}`;

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description} (${metrics})`);
    continue;
  }

  failed += 1;
  console.error(`✗ ${scenario.id}: ${result.reasons.join("; ")} (${metrics})`);
  for (const execution of result.toolExecutions) {
    console.error(`  tool: ${execution.display}`);
    console.error(`  exitCode: ${execution.exitCode}`);
    if (execution.stderr.length > 0) {
      console.error(`  stderr: ${execution.stderr}`);
    }
  }
  if (result.finalAnswer.length > 0) {
    console.error(`  finalAnswer: ${result.finalAnswer}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} agent-native workflow eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${workflowScenarios.length} agent-native workflow eval scenario(s) passed.`);
}
