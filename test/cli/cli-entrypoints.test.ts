import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");

const decode = (value: Uint8Array<ArrayBufferLike>) =>
  new TextDecoder().decode(value);

const runEntrypoint = (entrypoint: string, argv: readonly string[]) =>
  Bun.spawnSync({
    cmd: [process.execPath, entrypoint, ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

describe("CLI entrypoints", () => {
  let buildDir: string;
  let builtEntrypoint: string;

  beforeAll(() => {
    buildDir = mkdtempSync(join(tmpdir(), "darty-cli-"));
    builtEntrypoint = join(buildDir, "cli.js");

    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        "build",
        "src/cli.ts",
        "--target=bun",
        "--outfile",
        builtEntrypoint,
        "--minify",
        "--sourcemap=none",
      ],
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: process.env,
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to build CLI smoke-test bundle.\nstdout:\n${decode(
          result.stdout,
        )}\nstderr:\n${decode(result.stderr)}`,
      );
    }
  });

  afterAll(() => {
    rmSync(buildDir, { force: true, recursive: true });
  });

  test.each([
    ["source", "src/cli.ts"],
    ["bundled", () => builtEntrypoint],
  ] as const)("%s root help exposes the public commands", (_label, entrypoint) => {
    const result = runEntrypoint(
      typeof entrypoint === "function" ? entrypoint() : entrypoint,
      ["--help"],
    );
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("company-detail [options]");
    expect(stdout).toContain("company-rss [options]");
    expect(stdout).toContain("search-body [options]");
    expect(stdout).toContain("search-company [options]");
    expect(stdout).toContain("search-company-reports [options]");
    expect(stdout).toContain("view-report [options]");
    expect(stdout).not.toContain("contents-search [options]");
    expect(stdout).not.toContain("report-view [options]");
  });

  test("bundled CLI accepts the documented company-detail command", () => {
    const result = runEntrypoint(builtEntrypoint, ["company-detail", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty company-detail [options]");
    expect(stdout).toContain("--company-code <text>");
  });

  test("bundled CLI accepts the documented company-rss command", () => {
    const result = runEntrypoint(builtEntrypoint, ["company-rss", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty company-rss [options]");
    expect(stdout).toContain("--company-code <text>");
  });

  test("bundled CLI accepts the documented search-company command", () => {
    const result = runEntrypoint(builtEntrypoint, ["search-company", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty search-company [options]");
    expect(stdout).toContain("--company-name <text>");
  });

  test("bundled CLI accepts the documented search-company-reports command", () => {
    const result = runEntrypoint(builtEntrypoint, [
      "search-company-reports",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty search-company-reports [options]");
    expect(stdout).toContain("--company-code <text>");
    expect(stdout).toContain("--include-all-reports");
    expect(stdout).not.toContain("--sort-by");
  });

  test("bundled CLI accepts the documented view-report command", () => {
    const result = runEntrypoint(builtEntrypoint, ["view-report", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty view-report [options]");
    expect(stdout).toContain("--receipt <receipt-or-url>");
  });
});
