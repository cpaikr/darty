import { fileURLToPath } from "node:url";

import { createEvalArtifactWriter } from "../harness/artifacts.ts";
import { printFailedExecutions, printFinalAnswer } from "../harness/reporter.ts";
import { agentWorkflowScenarios } from "./agent-scenarios.ts";
import { runAgentWorkflowScenario } from "./agent-scenario-runner.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const judgeModel = process.env.OPENAI_JUDGE_MODEL ?? model;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (openAiApiKey === undefined || openAiApiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required for the agent workflow eval.");
}

let failed = 0;
const artifacts = await createEvalArtifactWriter({ suite: "workflow-agent" });

console.log(
  `Running ${agentWorkflowScenarios.length} model-assisted workflow scenario(s) with agent=${model}, judge=${judgeModel}.`,
);
console.log("This is an opt-in live/model eval; it is not a credential-free CI gate.");
console.log(`Artifacts: ${artifacts.runDir}`);

for (const scenario of agentWorkflowScenarios) {
  try {
    const result = await runAgentWorkflowScenario({
      scenario,
      repoRoot,
      model,
      judgeModel,
      openAiApiKey,
    });

    const artifactPath = await artifacts.writeScenario(scenario.id, {
      suite: "workflow-agent",
      model,
      judgeModel,
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
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    const artifactPath = await artifacts.writeScenario(scenario.id, {
      suite: "workflow-agent",
      model,
      judgeModel,
      error: message,
    });
    console.error(
      `✗ ${scenario.id}: ${message} (${artifactPath})`,
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} agent workflow scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${agentWorkflowScenarios.length} agent workflow scenario(s) passed.`);
}
