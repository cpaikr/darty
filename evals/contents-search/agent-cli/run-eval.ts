import { fileURLToPath } from "node:url";

import { runAgentCliScenario } from "./scenario-runner.ts";
import { contentsSearchCliScenarios } from "../shared/cli-scenarios.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the agentic CLI eval.");
}

let failed = 0;

console.log(
  `Running ${contentsSearchCliScenarios.length} agentic CLI invocation eval scenario(s) with ${model}.`,
);

for (const scenario of contentsSearchCliScenarios) {
  const result = await runAgentCliScenario({
    scenario,
    repoRoot,
    model,
    openAiApiKey,
  });

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description}`);
    continue;
  }

  failed += 1;
  console.error(`✗ ${scenario.id}: ${result.reasons.join("; ")}`);
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
  console.error(`\n${failed} agentic CLI invocation eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(
    `\n${contentsSearchCliScenarios.length} agentic CLI invocation eval scenario(s) passed.`,
  );
}
