import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");

const decode = (value: Uint8Array<ArrayBufferLike>) =>
  new TextDecoder().decode(value);

const nodeRuntime = process.env.DART_NODE_RUNTIME ?? "node";

const runEntrypoint = (
  runtime: string,
  entrypoint: string,
  argv: readonly string[],
) =>
  Bun.spawnSync({
    cmd: [runtime, entrypoint, ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

const runExecutable = (entrypoint: string, argv: readonly string[]) =>
  Bun.spawnSync({
    cmd: [entrypoint, ...argv],
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
        "run",
        "scripts/build-cli.ts",
        "--outfile",
        builtEntrypoint,
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
    ["source via Bun", process.execPath, "src/cli.ts"],
    ["bundled via Node", nodeRuntime, () => builtEntrypoint],
    ["bundled via Bun", process.execPath, () => builtEntrypoint],
  ] as const)(
    "%s root help exposes the public commands",
    (_label, runtime, entrypoint) => {
      const result = runEntrypoint(
        runtime,
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
      expect(stdout).toContain("disclosure-types [options]");
      expect(stdout).toContain("search-body [options]");
      expect(stdout).toContain("search-company [options]");
      expect(stdout).toContain("search-company-reports [options]");
      expect(stdout).toContain("view-report [options]");
      expect(stdout).toContain("브라우저 상호작용 중 발생하는 API 호출을 모방");
      expect(stdout).toContain("DART의 공식 OpenDART API를 사용하지 않습니다");
      expect(stdout).toContain("정확성을 보장하지 않습니다");
      expect(stdout).not.toContain("contents-search [options]");
      expect(stdout).not.toContain("report-view [options]");
    },
  );

  test("bundled CLI is executable through its Node shebang", () => {
    const result = runExecutable(builtEntrypoint, ["--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty [options] [command]");
  });

  test("bundled CLI renders unknown commands as JSON failures", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, ["missing-command"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const envelope = JSON.parse(stdout) as {
      readonly result: unknown;
      readonly error: { readonly code: string; readonly message: string };
    };

    expect(result.exitCode).toBe(1);
    expect(stderr).toBe("");
    expect(envelope.result).toBeNull();
    expect(envelope.error.code).toBe("invalid_request");
    expect(envelope.error.message).toContain("unknown command 'missing-command'");
  });

  test("bundled CLI validates command input through Node", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "company-detail",
      "--company-code",
      "005930",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const envelope = JSON.parse(stdout) as {
      readonly result: unknown;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly parameter?: string;
      };
    };

    expect(result.exitCode).toBe(1);
    expect(stderr).toBe("");
    expect(envelope.result).toBeNull();
    expect(envelope.error.code).toBe("invalid_request");
    expect(envelope.error.parameter).toBe("companyCode");
    expect(envelope.error.message).toContain(
      '옵션 "--company-code"은(는) 8자리 DART 회사 코드여야 합니다.',
    );
  });

  test("bundled CLI accepts the documented company-detail command", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "company-detail",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty company-detail [options]");
    expect(stdout).toContain("--company-code <text>");
  });

  test("bundled CLI accepts the documented company-rss command", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "company-rss",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty company-rss [options]");
    expect(stdout).toContain("--company-code <text>");
  });

  test("bundled CLI accepts the documented disclosure-types helper", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "disclosure-types",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty disclosure-types [options]");
    expect(stdout).toContain("--category <A-J>");
    expect(stdout).toContain("--query <text>");
  });

  test("bundled CLI accepts the documented search-company command", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "search-company",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty search-company [options]");
    expect(stdout).toContain("--company-name <text>");
  });

  test("bundled CLI accepts the documented search-company-reports command", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
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
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "view-report",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty view-report [options]");
    expect(stdout).toContain("--receipt <receipt-or-url>");
  });
});
