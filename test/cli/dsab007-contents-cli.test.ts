import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");

const runCli = (argv: readonly string[]) =>
  Bun.spawnSync({
    cmd: [process.execPath, "run", "src/cli.ts", ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

const decode = (value: Uint8Array<ArrayBufferLike>) =>
  new TextDecoder().decode(value);

describe("dsab007-contents CLI subprocess", () => {
  test("prints root help to stdout", () => {
    const result = runCli(["--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("Tool-oriented access to DART search and retrieval surfaces.");
    expect(stdout).toContain("dsab007-contents [options]");
    expect(stderr).toBe("");
  });

  test("prints shared help text", () => {
    const result = runCli(["dsab007-contents", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty dsab007-contents [options]");
    expect(stdout).toContain(
      "Semantic, read-only access to DART's dsab007 contents search.",
    );
    expect(stdout).toContain(
      "The command always prints JSON to stdout and reserves stderr for errors.",
    );
    expect(stdout).not.toContain("text-crp-nm");
    expect(stderr).toBe("");
  });

  test("fails missing required arguments with stderr only", () => {
    const result = runCli(["dsab007-contents"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain(
      'Missing required parameter "keyword". Expected a non-empty string.',
    );
  });

  test("fails invalid integer arguments with a non-zero exit code", () => {
    const result = runCli([
      "dsab007-contents",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--page",
      "nope",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain(
      "option '--page <number>' argument 'nope' is invalid",
    );
    expect(stderr).toContain('Expected an integer but received "nope".');
  });

  test("fails invalid enum arguments with a non-zero exit code", () => {
    const result = runCli([
      "dsab007-contents",
      "--keyword",
      "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--sort-by",
        "corp",
      ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain(
      'Parameter "sortBy" must be one of: date, reportName.',
    );
  });
});
