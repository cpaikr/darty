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
    expect(stdout).toContain("contents-search [options]");
    expect(stdout).toContain("도움말을 표시합니다.");
    expect(stdout).not.toContain("display help for command");
    expect(stderr).toBe("");
  });

  test("prints shared help text", () => {
    const result = runCli(["contents-search", "--help"]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Usage: darty contents-search [options]");
    expect(stdout).toContain(
      "DART 공시통합검색의 `본문내용` 모드로 제출 공시문서의 내용 검색 결과를 반환합니다.",
    );
    expect(stdout).toContain("--keyword <text>");
    expect(stdout).toContain("명령 도움말을 표시합니다.");
    expect(stdout).not.toContain("display help for command");
    expect(stdout).toContain("DART 공통 검색 문법");
    expect(stdout).toContain("`사과|포도`=OR");
    expect(stdout).not.toContain("사과포도");
    expect(stdout).not.toContain("[확인됨]");
    expect(stdout).not.toContain("참고:");
    expect(stdout).not.toContain(
      "`전체`, `회사명`, `보고서명`, `보고서 목차명`, `고급검색` 모드는 아직 공개 도구가 아닙니다.",
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
    expect(stdout).toContain("명령 도움말을 표시합니다.");
    expect(stdout).not.toContain("display help for command");
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
      '필수 옵션 "--start-date"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
    );
  });

  test("fails later missing required arguments with CLI flag names", () => {
    const result = runCli([
      "contents-search",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
    ]);
    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);

    expect(result.exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain(
      '필수 옵션 "--end-date"이(가) 없습니다. 필요한 값: YYYYMMDD 형식의 날짜 문자열.',
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
      '옵션 "--sort-by"은(는) 다음 중 하나여야 합니다: date, reportName.',
    );
  });
});
