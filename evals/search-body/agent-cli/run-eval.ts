import { fileURLToPath } from "node:url";

import { createEvalArtifactWriter } from "../../harness/artifacts.ts";
import { printFailedExecutions, printFinalAnswer } from "../../harness/reporter.ts";
import { runAgentCliScenario } from "./scenario-runner.ts";
import { searchBodyCliScenarios } from "../shared/cli-scenarios.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the agentic CLI eval.");
}

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "search-body-agent-cli" });

console.log(
  `Running ${searchBodyCliScenarios.length} agentic CLI invocation eval scenario(s) with ${model}.`,
);
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of searchBodyCliScenarios) {
  const result = await runAgentCliScenario({
    scenario,
    repoRoot,
    model,
    openAiApiKey,
  });

  const artifactPath = await artifacts.writeScenario(scenario.id, {
    suite: "search-body-agent-cli",
    model,
    result,
  });

  if (result.pass) {
    console.log(`✓ ${scenario.id}: ${scenario.description} (${artifactPath})`);
    continue;
  }

  failed += 1;
  console.error(`✗ ${scenario.id}: ${result.reasons.join("; ")} (${artifactPath})`);
  printFailedExecutions(result.toolExecutions);
  printFinalAnswer(result.finalAnswer);
}

if (failed > 0) {
  console.error(`\n${failed} agentic CLI invocation eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(
    `\n${searchBodyCliScenarios.length} agentic CLI invocation eval scenario(s) passed.`,
  );
}
