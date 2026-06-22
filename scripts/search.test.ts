import { describe, expect, test } from "bun:test";

const runSearchScript = async (args: readonly string[]) => {
  const subprocess = Bun.spawn([process.execPath, "scripts/search.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);

  return { exitCode, stderr, stdout };
};

describe("scripts/search.ts", () => {
  test("runs the top-level darty CLI without adding a command", async () => {
    const result = await runSearchScript(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: darty [options] [command]");
    expect(result.stdout).toContain("search-body");
  });

  test("forwards subcommands to the darty CLI", async () => {
    const result = await runSearchScript(["search-body", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: darty search-body [options]");
  });
});
