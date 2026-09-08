import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");

const runCli = (argv: readonly string[]) =>
  Bun.spawnSync({
    cmd: [process.env.DARTY_CLI ?? "./target/release/darty", ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

const decode = (value: Uint8Array<ArrayBufferLike>) =>
  new TextDecoder().decode(value);

const parseJsonStdout = (result: ReturnType<typeof runCli>): unknown =>
  JSON.parse(decode(result.stdout));

const expectJsonFailure = (
  result: ReturnType<typeof runCli>,
  expected: {
    readonly code: string;
    readonly messageIncludes: readonly string[];
    readonly parameter?: string;
  },
) => {
  const stdout = decode(result.stdout);
  const stderr = decode(result.stderr);

  expect(result.exitCode).toBe(1);
  expect(stderr).toBe("");

  const envelope = JSON.parse(stdout) as {
    readonly result: unknown;
    readonly metadata: { readonly cliTransportVersion: string };
    readonly references: Record<string, unknown>;
    readonly warnings: readonly unknown[];
    readonly error: {
      readonly code: string;
      readonly message: string;
      readonly retryable: boolean;
      readonly parameter?: string;
    };
  };

  expect(envelope.result).toBeNull();
  expect(envelope.metadata.cliTransportVersion).toBe("1");
  expect(envelope.references).toEqual({});
  expect(envelope.warnings).toEqual([]);
  expect(envelope.error.code).toBe(expected.code);
  expect(envelope.error.retryable).toBe(false);
  if (expected.parameter !== undefined) {
    expect(envelope.error.parameter).toBe(expected.parameter);
  }
  for (const message of expected.messageIncludes) {
    expect(envelope.error.message).toContain(message);
  }
};

describe("search-body CLI subprocess", () => {
  test("prints a compact JSON home view when no command is passed", () => {
    const result = runCli([]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const envelope = JSON.parse(stdout) as {
      readonly result: {
        readonly name: string;
        readonly operations: readonly { readonly name: string }[];
      };
      readonly metadata: { readonly output: string };
      readonly help: readonly string[];
    };

    expect(result.exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(envelope.result.name).toBe("darty");
    expect(envelope.result.operations.map((operation) => operation.name)).toContain(
      "search-body",
    );
    expect(envelope.metadata.output).toBe("home");
    expect(envelope.help).toContain("Run darty --help for full human-readable command help.");
  });

  test("prints root help to stdout", () => {
    const result = runCli(["--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("Tool-friendly DART search and retrieval commands.");
    expect(stdout).toContain("search-body [options]");
    expect(stdout).toContain("Display help.");
    expect(stdout).not.toContain("display help for command");
    expect(stderr).toBe("");
  });

  test("prints shared help text", () => {
    const result = runCli(["search-body", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty search-body [options]");
    expect(stdout).toContain(
      "Search submitted filing text through DART 공시통합검색 `본문내용` mode.",
    );
    expect(stdout).toContain("--keyword <text>");
    expect(stdout).toContain("Display command help.");
    expect(stdout).not.toContain("display help for command");
    expect(stdout).toContain("DART shared search syntax");
    expect(stdout).toContain("`사과|포도`=OR");
    expect(stdout).not.toContain("사과포도");
    expect(stdout).not.toContain("[확인됨]");
    expect(stdout).not.toContain("참고:");
    expect(stdout).toContain("Search tips:");
    expect(stdout).toContain("본문내용 search is document-level keyword search.");
    expect(stdout).toContain("not necessarily in the same paragraph, table, or item.");
    expect(stdout).toContain(
      "pass a result viewerUrl or receipt number to view-report",
    );
    expect(stdout).not.toContain(
      "`전체`, `회사명`, `보고서명`, `보고서 목차명`, `고급검색` 모드는 아직 공개 도구가 아닙니다.",
    );
    expect(stdout).not.toContain("text-crp-nm");
    expect(stdout).not.toContain("--limit");
    expect(stdout).not.toContain("--company-name");
    expect(stderr).toBe("");
  });

  test("prints JSON failure when no command options are passed", () => {
    const result = runCli(["search-body"]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "keyword",
      messageIncludes: ['Missing required option "--keyword".'],
    });
  });

  test("prints JSON failure for partial missing required arguments", () => {
    const result = runCli(["search-body", "--keyword", "배당"]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "startDate",
      messageIncludes: [
        'Missing required option "--start-date". Expected date string in YYYYMMDD format.',
      ],
    });
  });

  test("prints later missing required arguments with CLI flag names", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
    ]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "endDate",
      messageIncludes: [
        'Missing required option "--end-date". Expected date string in YYYYMMDD format.',
      ],
    });
  });

  test("prints JSON failure for invalid integer arguments", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--page",
      "nope",
    ]);

    expectJsonFailure(result, {
      code: "invalid_request",
      messageIncludes: [
        "option '--page <number>' argument 'nope' is invalid",
        'Expected an integer but received "nope".',
      ],
    });
  });

  test("prints pretty JSON failures when requested", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--pretty",
    ]);
    const stdout = decode(result.stdout);

    expect(result.exitCode).toBe(1);
    expect(decode(result.stderr)).toBe("");
    expect(stdout).toContain('\n  "result": null');
    expect((parseJsonStdout(result) as { error: { code: string } }).error.code).toBe(
      "invalid_request",
    );
  });

  test("prints JSON failure for invalid enum arguments", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--sort-by",
      "corp",
    ]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "sortBy",
      messageIncludes: [
        'Option "--sort-by" must be one of: date, reportName.',
      ],
    });
  });

  test("explains that company-code expects a DART company code, not a stock code", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--company-code",
      "005930",
    ]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "companyCode",
      messageIncludes: [
        'Option "--company-code" must be an 8-digit DART company code.',
        "Company names and 6-digit stock codes are not accepted.",
      ],
    });
  });

  test("rejects impossible calendar dates before searching DART", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250230",
      "--end-date",
      "20250331",
    ]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "startDate",
      messageIncludes: [
        'Option "--start-date" must be a real date in YYYYMMDD format.',
        '"20250230" is not a valid date.',
      ],
    });
  });

  test("rejects date ranges where start-date is after end-date before searching DART", () => {
    const result = runCli([
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20250101",
    ]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "startDate",
      messageIncludes: [
        "startDate cannot be after endDate.",
        "startDate=20250331, endDate=20250101",
      ],
    });
  });
});

test("numeric parser errors name their option for malformed and out-of-range values", () => {
  for (const [command, flag] of [
    ["search-body", "--page"], ["search-company", "--page-size"],
    ["view-report", "--max-bytes"], ["view-report", "--content-start-byte"],
    ["view-report", "--toc-depth"],
  ] as const) {
    for (const value of ["abc", "-1", "4294967296"]) {
      expectJsonFailure(runCli([command, `${flag}=${value}`]), {
        code: "invalid_request", parameter: flag,
        messageIncludes: ["Expected an integer"],
      });
    }
  }
});

test("negative content offsets preserve the same failure for both argument forms", () => {
  const separate = runCli(["view-report", "--content-start-byte", "-27"]);
  const attached = runCli(["view-report", "--content-start-byte=-27"]);
  expect(parseJsonStdout(attached)).toEqual(parseJsonStdout(separate));
});
