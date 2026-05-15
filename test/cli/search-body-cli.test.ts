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
  test("prints root help to stdout when no command is passed", () => {
    const result = runCli([]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.");
    expect(stdout).toContain("search-body [options]");
    expect(stdout).toContain("도움말을 표시합니다.");
    expect(stdout).not.toContain("display help for command");
    expect(stderr).toBe("");
  });

  test("prints root help to stdout", () => {
    const result = runCli(["--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.");
    expect(stdout).toContain("search-body [options]");
    expect(stdout).toContain("도움말을 표시합니다.");
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
      "DART 공시통합검색의 `본문내용` 모드로 제출 공시문서 내용을 검색합니다.",
    );
    expect(stdout).toContain("--keyword <text>");
    expect(stdout).toContain("명령 도움말을 표시합니다.");
    expect(stdout).not.toContain("display help for command");
    expect(stdout).toContain("DART 공통 검색 문법");
    expect(stdout).toContain("`사과|포도`=OR");
    expect(stdout).not.toContain("사과포도");
    expect(stdout).not.toContain("[확인됨]");
    expect(stdout).not.toContain("참고:");
    expect(stdout).toContain("검색 팁:");
    expect(stdout).toContain("본문내용 검색은 문서 단위 키워드 검색입니다.");
    expect(stdout).toContain("같은 문단/표/항목에 함께 있다는 뜻은 아닙니다.");
    expect(stdout).toContain(
      "결과의 viewerUrl 또는 접수번호를 view-report에 넘겨 실제 보고서 본문을 확인하세요.",
    );
    expect(stdout).not.toContain(
      "`전체`, `회사명`, `보고서명`, `보고서 목차명`, `고급검색` 모드는 아직 공개 도구가 아닙니다.",
    );
    expect(stdout).not.toContain("text-crp-nm");
    expect(stdout).not.toContain("--limit");
    expect(stdout).not.toContain("--company-name");
    expect(stderr).toBe("");
  });

  test("prints command help to stdout when no command options are passed", () => {
    const result = runCli(["search-body"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty search-body [options]");
    expect(stdout).toContain("--keyword <text>");
    expect(stdout).toContain("명령 도움말을 표시합니다.");
    expect(stdout).not.toContain("display help for command");
    expect(stdout).toContain("--start-date <YYYYMMDD>");
    expect(stdout).toContain("--end-date <YYYYMMDD>");
    expect(stderr).toBe("");
  });

  test("prints JSON failure for partial missing required arguments", () => {
    const result = runCli(["search-body", "--keyword", "배당"]);

    expectJsonFailure(result, {
      code: "invalid_request",
      parameter: "startDate",
      messageIncludes: [
        '필수 옵션 "--start-date"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
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
        '필수 옵션 "--end-date"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
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
        '정수를 입력해야 하지만 "nope"을(를) 받았습니다.',
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
        '옵션 "--sort-by"은(는) 다음 중 하나여야 합니다: date, reportName.',
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
        '옵션 "--company-code"은(는) 8자리 DART 회사 코드여야 합니다.',
        "회사명이나 6자리 종목코드는 사용할 수 없습니다.",
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
        '옵션 "--start-date"은(는) YYYYMMDD 형식의 실제 날짜여야 합니다.',
        '"20250230"은(는) 유효한 날짜가 아닙니다.',
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
        "검색 시작일은 종료일보다 늦을 수 없습니다.",
        "startDate=20250331, endDate=20250101",
      ],
    });
  });
});
