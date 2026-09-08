#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const executable = resolve(process.env.DARTY_CLI ?? join(root, "target/release/darty"));
const judge = join(root, "scripts/judge-cli-v1.mjs");
const runJudge = command => spawnSync(process.execPath, [judge, "--profile", "process", "--", ...command], { cwd: root, encoding: "utf8" });
const pristine = runJudge([executable]);
assert.equal(pristine.status, 0, pristine.stderr);
const temporary = mkdtempSync(join(tmpdir(), "darty-cli-mutant-"));
try {
  const mutant = join(temporary, "cli.mjs");
  writeFileSync(mutant, `import { spawnSync } from 'node:child_process';\nconst r = spawnSync(${JSON.stringify(executable)}, process.argv.slice(2), {encoding:'utf8'});\nprocess.stdout.write(r.stdout.replaceAll('"cliTransportVersion":"1"', '"cliTransportVersion":"2"'));\nprocess.stderr.write(r.stderr);\nprocess.exitCode = r.status ?? 1;\n`);
  const changed = runJudge([process.execPath, mutant]);
  assert.notEqual(changed.status, 0, "Judge accepted mutated transport version");
  assert.ok(changed.stderr.includes("/metadata/cliTransportVersion"), changed.stderr);
  console.log("Mutation proof passed: the independent judge rejected a changed transport version.");
} finally { rmSync(temporary, { recursive: true, force: true }); }
