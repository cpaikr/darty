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
  test("prints root help to stdout when no command is passed", () => {
    const result = runCli([]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.");
    expect(stdout).toContain("contents-search [options]");
    expect(stderr).toBe("");
  });

  test("prints root help to stdout", () => {
    const result = runCli(["--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty [options] [command]");
    expect(stdout).toContain("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.");
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
      "내부 dsab007 재현 어댑터를 통해 DART 공시 본문 검색을 읽기 전용 의미 기반 입력으로 제공합니다.",
    );
    expect(stdout).toContain("dsab007 재현 어댑터");
    expect(stdout).toContain(
      "이 모드의 페이지 크기와 페이지 이동 폭은 현재 DART가 제어",
    );
    expect(stdout).not.toContain("text-crp-nm");
    expect(stdout).not.toContain("--limit");
    expect(stdout).not.toContain("--company-name");
    expect(stderr).toBe("");
  });

  test("prints command help to stdout when no command options are passed", () => {
    const result = runCli(["contents-search"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty contents-search [options]");
    expect(stdout).toContain("--keyword <text>");
    expect(stdout).toContain("--start-date <YYYYMMDD>");
    expect(stdout).toContain("--end-date <YYYYMMDD>");
    expect(stderr).toBe("");
  });

  test("fails partial missing required arguments with stderr only", () => {
    const result = runCli(["contents-search", "--keyword", "배당"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain(
      '필수 매개변수 "startDate"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
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
    expect(stderr).toContain('정수를 입력해야 하지만 "nope"을(를) 받았습니다.');
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
      '매개변수 "sortBy"은(는) 다음 중 하나여야 합니다: date, reportName.',
    );
  });
});
