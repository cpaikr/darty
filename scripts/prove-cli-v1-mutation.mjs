#!/usr/bin/env node

import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const judge = join(repoRoot, "scripts/judge-cli-v1.mjs");
const baseline = join(repoRoot, "dist/cli.js");
const mutationTarget = 'cliTransportVersion:"1"';
const mutationValue = 'cliTransportVersion:"2"';

const runJudge = (entrypoint) =>
  spawnSync(
    process.execPath,
    [judge, "--profile", "vertical", "--", process.execPath, entrypoint],
    { cwd: repoRoot, encoding: "utf8" },
  );

const pristine = runJudge(baseline);
if (pristine.status !== 0) {
  console.error("The pristine baseline failed before mutation.");
  console.error(pristine.stdout);
  console.error(pristine.stderr);
  process.exit(1);
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "darty-cli-mutant-"));
const mutant = join(temporaryDirectory, "cli.mjs");

try {
  copyFileSync(baseline, mutant);
  const source = readFileSync(mutant, "utf8");
  const occurrences = source.split(mutationTarget).length - 1;

  if (occurrences < 1) {
    throw new Error(`Could not find mutation sentinel ${mutationTarget}`);
  }

  writeFileSync(mutant, source.replaceAll(mutationTarget, mutationValue));
  const mutated = runJudge(mutant);

  if (mutated.status === 0) {
    throw new Error("The parity judge accepted the deliberately mutated CLI bundle.");
  }
  if (!mutated.stderr.includes("/metadata/cliTransportVersion")) {
    throw new Error(
      `The judge rejected the mutant for an unexpected reason:\n${mutated.stderr}`,
    );
  }

  console.log(
    `Mutation proof passed: ${occurrences} transport-version sentinel(s) changed in a disposable bundle and the judge rejected it.`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
