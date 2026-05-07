import { describe, expect, test } from "bun:test";

import {
  CompanyRssFailure,
  resolveCompanyRssRequest,
} from "../../capabilities/company-rss/contract.ts";
import {
  companyRssUsage,
  parseCompanyRssCommandArgs,
  renderCompanyRssCliErrorMessage,
} from "./company-rss.ts";

describe("parseCompanyRssCommandArgs", () => {
  test("parses company code flag", () => {
    expect(parseCompanyRssCommandArgs(["--company-code", "00126380"])).toEqual({
      companyCode: "00126380",
    });
  });

  test("resolves parsed options through the shared resolver", () => {
    expect(
      resolveCompanyRssRequest(
        parseCompanyRssCommandArgs(["--company-code", "00126380"]) as Record<
          string,
          unknown
        >,
      ),
    ).toEqual({ companyCode: "00126380" });
  });

  test("documents the CLI surface", () => {
    expect(companyRssUsage).toContain("--company-code <text>");
    expect(companyRssUsage).toContain("RSS");
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new CompanyRssFailure({
      code: "invalid_request",
      message:
        '필수 매개변수 "companyCode"이(가) 없습니다. 필요한 값: 8자리 DART 회사 코드.',
      parameter: "companyCode",
      retryable: false,
    });

    expect(renderCompanyRssCliErrorMessage(error)).toBe(
      '필수 옵션 "--company-code"이(가) 없습니다. 필요한 값: 8자리 DART 회사 코드.',
    );
  });
});
