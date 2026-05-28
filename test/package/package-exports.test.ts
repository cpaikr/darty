import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");
const nodeRuntime = process.env.DART_NODE_RUNTIME ?? "node";

const decode = (value: Uint8Array<ArrayBufferLike>) =>
  new TextDecoder().decode(value);

const run = (cmd: readonly string[], cwd: string) => {
  const result = Bun.spawnSync({
    cmd: [...cmd],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Command failed: ${cmd.join(" ")}\nstdout:\n${decode(
        result.stdout,
      )}\nstderr:\n${decode(result.stderr)}`,
    );
  }

  return result;
};

describe("packed package exports", () => {
  let workDir: string;
  let consumerDir: string;

  beforeAll(() => {
    const tempRoot = join(repoRoot, ".tmp");
    mkdirSync(tempRoot, { recursive: true });
    workDir = mkdtempSync(join(tempRoot, "package-smoke-"));
    consumerDir = join(workDir, "consumer");

    run([process.execPath, "run", "build"], repoRoot);

    const pack = run(
      ["npm", "pack", "--ignore-scripts", "--pack-destination", workDir],
      repoRoot,
    );
    const tarballName = decode(pack.stdout).trim().split("\n").at(-1);

    if (tarballName === undefined || tarballName.length === 0) {
      throw new Error("npm pack did not report a tarball name.");
    }

    const packageDir = join(consumerDir, "node_modules", "@sjunepark", "darty");
    mkdirSync(packageDir, { recursive: true });
    run(
      ["tar", "-xzf", join(workDir, basename(tarballName)), "-C", packageDir, "--strip-components=1"],
      repoRoot,
    );

    const binDir = join(consumerDir, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binTarget = join(packageDir, "dist", "cli.js");
    chmodSync(binTarget, 0o755);
    symlinkSync(binTarget, join(binDir, "darty"));

    writeFileSync(
      join(consumerDir, "smoke.mjs"),
      `import assert from "node:assert/strict";\n` +
        `import { spawnSync } from "node:child_process";\n` +
        `const help = spawnSync("./node_modules/.bin/darty", ["--help"], { cwd: process.cwd(), encoding: "utf8" });\n` +
        `assert.equal(help.status, 0, help.stderr);\n` +
        `assert.match(help.stdout, /Usage: darty/);\n` +
        `const failure = spawnSync("./node_modules/.bin/darty", ["not-a-command"], { cwd: process.cwd(), encoding: "utf8" });\n` +
        `assert.notEqual(failure.status, 0);\n` +
        `const failureJson = JSON.parse(failure.stdout);\n` +
        `assert.equal(failureJson.result, null);\n` +
        `assert.equal(failureJson.error.code, "invalid_request");\n`,
    );
  }, 60_000);

  afterAll(() => {
    rmSync(workDir, { force: true, recursive: true });
  });

  test("exposes only the CLI public surface", () => {
    run([nodeRuntime, "smoke.mjs"], consumerDir);
  });

  test("packs only the executable CLI artifact", () => {
    const packageDir = join(consumerDir, "node_modules", "@sjunepark", "darty");

    expect(
      readFileSync(join(packageDir, "dist", "cli.js"), "utf8").startsWith(
        "#!/usr/bin/env node",
      ),
    ).toBe(true);
  });
});
