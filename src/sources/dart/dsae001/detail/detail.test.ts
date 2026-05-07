import { describe, expect, test } from "bun:test";

import { SourceNotFound } from "../../errors.ts";
import { toDsae001CompanyDetailProviderError } from "./detail.ts";

describe("toDsae001CompanyDetailProviderError", () => {
  test("maps empty DART detail responses to not_found", () => {
    const error = toDsae001CompanyDetailProviderError(
      new SourceNotFound({
        message:
          "DART 기업개황 상세에서 회사 코드 99999999에 해당하는 회사를 찾지 못했습니다.",
        sourceUrl: "https://dart.fss.or.kr/dsae001/select.ax?selectKey=99999999",
      }),
    );

    expect(error.code).toBe("not_found");
    expect(error.retryable).toBe(false);
    expect(error.sourceUrl).toBe(
      "https://dart.fss.or.kr/dsae001/select.ax?selectKey=99999999",
    );
  });
});
