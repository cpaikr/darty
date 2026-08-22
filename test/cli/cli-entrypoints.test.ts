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
    builtEntrypoint = join(buildDir, "cli.mjs");

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
  }, 30_000);

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
      expect(stdout).toContain("report-guide");
      expect(stdout).toContain("search-body [options]");
      expect(stdout).toContain("search-company [options]");
      expect(stdout).toContain("search-company-reports [options]");
      expect(stdout).toContain("view-report [options]");
      expect(stdout).toContain("Common agent flow");
      expect(stdout).toContain("search-company --company-name 삼성전자");
      expect(stdout).toContain("search-company-reports --company-code 00126380");
      expect(stdout).toContain("view-report --receipt <filing.receiptNumber-or-viewerUrl>");
      expect(stdout).toContain("Commands print a JSON response object to stdout");
      expect(stdout).toContain("failures exit non-zero");
      expect(stdout).toContain("replays read-only DART web requests observed during browser interaction");
      expect(stdout).toContain("does not use DART's official OpenDART API");
      expect(stdout).toContain("does not guarantee accuracy");
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

  test("bundled CLI renders bare invocation as a JSON home view", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, []);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const envelope = JSON.parse(stdout) as {
      readonly result: {
        readonly name: string;
        readonly operations: readonly { readonly name: string }[];
      };
      readonly metadata: { readonly cliTransportVersion: string; readonly output: string };
      readonly help: readonly string[];
    };

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(envelope.result.name).toBe("darty");
    expect(envelope.result.operations.map((operation) => operation.name)).toContain(
      "view-report",
    );
    expect(envelope.metadata).toEqual({
      cliTransportVersion: "1",
      output: "home",
    });
    expect(envelope.help.some((hint) => hint.includes("search-company"))).toBe(true);
  });

  test("bundled CLI renders unknown commands as JSON failures", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, ["missing-command"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const envelope = JSON.parse(stdout) as {
      readonly result: unknown;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly recoveryHint?: string;
      };
    };

    expect(result.exitCode).toBe(1);
    expect(stderr).toBe("");
    expect(envelope.result).toBeNull();
    expect(envelope.error.code).toBe("invalid_request");
    expect(envelope.error.message).toContain("unknown command 'missing-command'");
    expect(envelope.error.recoveryHint).toBe("Run darty --help to list commands.");
  });

  test.each([
    [["missing-command", "--help"]],
    [["help", "missing-command"]],
  ] as const)(
    "bundled CLI renders unknown help target %p as JSON failures",
    (argv) => {
      const result = runEntrypoint(nodeRuntime, builtEntrypoint, argv);
      const stdout = decode(result.stdout);
      const stderr = decode(result.stderr);
      const envelope = JSON.parse(stdout) as {
        readonly result: unknown;
        readonly error: { readonly code: string; readonly recoveryHint?: string };
      };

      expect(result.exitCode).toBe(1);
      expect(stderr).toBe("");
      expect(envelope.result).toBeNull();
      expect(envelope.error.code).toBe("invalid_request");
      expect(envelope.error.recoveryHint).toBe("Run darty --help to list commands.");
    },
  );

  test("bundled CLI renders missing required command input as JSON failures", () => {
    for (const command of [
      "company-detail",
      "company-rss",
      "search-body",
      "search-company",
      "search-company-reports",
      "view-report",
    ]) {
      const result = runEntrypoint(nodeRuntime, builtEntrypoint, [command]);
      const stdout = decode(result.stdout);
      const stderr = decode(result.stderr);
      const envelope = JSON.parse(stdout) as {
        readonly result: unknown;
        readonly error: { readonly code: string; readonly recoveryHint?: string };
      };

      expect(result.exitCode).toBe(1);
      expect(stderr).toBe("");
      expect(envelope.result).toBeNull();
      expect(envelope.error.code).toBe("invalid_request");
      expect(typeof envelope.error.recoveryHint).toBe("string");
    }
  });

  test("bundled CLI keeps explicit command help as text", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "search-company",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty search-company [options]");
    expect(stdout).not.toContain('"result"');
  });

  test.each([
    [["search-company", "--page-size", "nope"], "--page-size"],
    [["search-company", "--bogus"], "--bogus"],
  ] as const)(
    "bundled CLI adds recovery hints to option parse errors for %p",
    (argv, parameter) => {
      const result = runEntrypoint(nodeRuntime, builtEntrypoint, argv);
      const stdout = decode(result.stdout);
      const stderr = decode(result.stderr);
      const envelope = JSON.parse(stdout) as {
        readonly error: {
          readonly code: string;
          readonly parameter?: string;
          readonly recoveryHint?: string;
        };
      };

      expect(result.exitCode).toBe(1);
      expect(stderr).toBe("");
      expect(envelope.error.code).toBe("invalid_request");
      expect(envelope.error.parameter).toBe(parameter);
      expect(envelope.error.recoveryHint).toBe(
        "Run darty search-company --help for options and examples.",
      );
    },
  );

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
      'Option "--company-code" must be an 8-digit DART company code.',
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

  test("bundled CLI accepts the documented report-guide command", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, [
      "report-guide",
      "--help",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: darty report-guide [options]");
    expect(stdout).toContain("DART report information guide");
  });

  test("bundled CLI prints report-guide as human Markdown", () => {
    const result = runEntrypoint(nodeRuntime, builtEntrypoint, ["report-guide"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("# DART report information guide");
    expect(stdout).toContain("사업보고서");
    expect(stdout).toContain("주요사항보고서");
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
