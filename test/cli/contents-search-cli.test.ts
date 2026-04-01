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

describe("contents-search CLI subprocess", () => {
  test("prints root help to stdout", () => {
    const result = runCli(["--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("Tool-oriented access to DART search and retrieval surfaces.");
    expect(stdout).toContain("contents-search [options]");
    expect(stderr).toBe("");
  });

  test("prints shared help text", () => {
    const result = runCli(["contents-search", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty contents-search [options]");
    expect(stdout).toContain(
      "Semantic, read-only access to DART filing contents search backed by an internal",
    );
    expect(stdout).toContain("dsab007 replay adapter.");
    expect(stdout).toContain(
      "DART currently controls page size and pager width for this mode",
    );
    expect(stdout).not.toContain("text-crp-nm");
    expect(stdout).not.toContain("--limit");
    expect(stdout).not.toContain("--company-name");
    expect(stderr).toBe("");
  });

  test("fails missing required arguments with stderr only", () => {
    const result = runCli(["contents-search"]);
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
      "contents-search",
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
      "contents-search",
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
