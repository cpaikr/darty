import { dartyExecutable } from "../../surfaces/cli/executable.ts";
import { fileURLToPath } from "node:url";

import {
  assertSearchBodyEnvelope,
  parseJsonObject,
} from "../shared/cli-envelope-assertions.ts";
import { searchBodyCliScenarios } from "../shared/cli-scenarios.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const runCli = (argv: readonly string[]) =>
  Bun.spawnSync({
    cmd: [dartyExecutable(repoRoot), ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

const formatOutputSizeMetric = (
  stdout: string,
  envelope: Record<string, unknown>,
): string => {
  const stdoutUtf8Bytes = encoder.encode(stdout).byteLength;
  const envelopeJsonCharacters = JSON.stringify(envelope).length;

  return `stdoutUtf8Bytes=${stdoutUtf8Bytes}, envelopeJsonCharacters=${envelopeJsonCharacters}`;
};

let failed = 0;

for (const scenario of searchBodyCliScenarios) {
  const result = runCli(scenario.argv);
  const stdout = decoder.decode(result.stdout).trim();
  const stderr = decoder.decode(result.stderr).trim();

  if (result.exitCode !== 0) {
    failed += 1;
    console.error(`✗ ${scenario.id}: CLI exited with ${result.exitCode}`);
    console.error(`stderrBytes=${encoder.encode(stderr).byteLength}`);
    continue;
  }

  try {
    const envelope = parseJsonObject(stdout);
    const assertion = assertSearchBodyEnvelope(envelope, scenario);

    if (assertion.pass) {
      console.log(
        `✓ ${scenario.id}: ${scenario.description} (${formatOutputSizeMetric(
          stdout,
          envelope,
        )})`,
      );
      continue;
    }

    failed += 1;
    console.error(`✗ ${scenario.id}: ${assertion.reasons.join("; ")}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${scenario.id}: invalid CLI envelope`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} CLI eval scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${searchBodyCliScenarios.length} CLI eval scenario(s) passed.`);
}
