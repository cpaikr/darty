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

  test("pretty prints failure envelopes when requested", () => {
    const text = renderCliFailureJson(new Error("boom"), { pretty: true });

    expect(text).toContain("\n  \"result\": null");
    expect(JSON.parse(text).error).toEqual({
      code: "internal_error",
      message: "boom",
      retryable: false,
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
});
