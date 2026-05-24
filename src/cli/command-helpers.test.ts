import { describe, expect, test } from "bun:test";

import { SearchBodyFailure } from "../capabilities/search-body/contract.ts";
import { renderCliFailureJson } from "./command-helpers.ts";

describe("renderCliFailureJson", () => {
  test("renders typed capability failures as the CLI failure envelope", () => {
    const text = renderCliFailureJson(
      new SearchBodyFailure({
        code: "invalid_request",
        message: "missing keyword",
        parameter: "keyword",
        retryable: false,
      }),
      { message: '필수 옵션 "--keyword"이(가) 없습니다.' },
    );

    expect(JSON.parse(text)).toEqual({
      result: null,
      metadata: {
        cliTransportVersion: "1",
      },
      references: {},
      warnings: [],
      error: {
        code: "invalid_request",
        message: '필수 옵션 "--keyword"이(가) 없습니다.',
        retryable: false,
        parameter: "keyword",
      },
    });
  });

  test("passes through typed recovery hints when present", () => {
    const text = renderCliFailureJson(
      new SearchBodyFailure({
        code: "invalid_request",
        message: "bad company code",
        parameter: "companyCode",
        retryable: false,
        recoveryHint: "search-company로 8자리 companyCode를 확인하세요.",
      }),
    );

    expect(JSON.parse(text).error).toMatchObject({
      code: "invalid_request",
      parameter: "companyCode",
      recoveryHint: "search-company로 8자리 companyCode를 확인하세요.",
    });
  });

  test("pretty prints failure envelopes when requested", () => {
    const text = renderCliFailureJson(new Error("boom"), { pretty: true });

    expect(text).toContain("\n  \"result\": null");
    expect(JSON.parse(text).error).toEqual({
      code: "internal_error",
      message: "boom",
      retryable: false,
    });
  });

  test("adds recovery hints to unknown Commander commands", () => {
    const text = renderCliFailureJson({
      code: "commander.unknownCommand",
      message: "error: unknown command 'nope'",
    });

    expect(JSON.parse(text).error).toEqual({
      code: "invalid_request",
      message: "error: unknown command 'nope'",
      retryable: false,
      recoveryHint: "Run darty --help to list commands.",
    });
  });

  test("adds command help recovery to Commander option errors", () => {
    const text = renderCliFailureJson(
      {
        code: "commander.invalidArgument",
        message:
          "error: option '--page-size <number>' argument 'nope' is invalid. Expected an integer but received \"nope\".",
      },
      { commandName: "search-company" },
    );

    expect(JSON.parse(text).error).toEqual({
      code: "invalid_request",
      message:
        "error: option '--page-size <number>' argument 'nope' is invalid. Expected an integer but received \"nope\".",
      retryable: false,
      parameter: "--page-size",
      recoveryHint: "Run darty search-company --help for options and examples.",
    });
  });

  test("does not pass through unknown structural error codes", () => {
    const text = renderCliFailureJson({
      code: "provider_private_error",
      message: "private provider detail",
      retryable: true,
    });

    const error = JSON.parse(text).error as {
      readonly code: string;
      readonly retryable: boolean;
    };

    expect(error.code).toBe("internal_error");
    expect(error.retryable).toBe(false);
  });

  test("does not pass through non-string typed failure optional fields", () => {
    const text = renderCliFailureJson({
      code: "invalid_request",
      message: "bad recovery hint",
      retryable: false,
      recoveryHint: { text: "retry" },
    });

    const error = JSON.parse(text).error as {
      readonly code: string;
      readonly retryable: boolean;
      readonly recoveryHint?: unknown;
    };

    expect(error.code).toBe("internal_error");
    expect(error.retryable).toBe(false);
    expect(error.recoveryHint).toBeUndefined();
  });
});
