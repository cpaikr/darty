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
      request: { companyCode: "00126380" },
      output: { pretty: false },
    });
  });

  test("resolves parsed options through the shared resolver", () => {
    expect(
      resolveCompanyRssRequest(
        parseCompanyRssCommandArgs(["--company-code", "00126380"]).request,
      ),
    ).toEqual({ companyCode: "00126380", detail: "concise" });
  });

  test("documents the CLI surface", () => {
    expect(companyRssUsage).toContain("--company-code <text>");
    expect(companyRssUsage).toContain("--detail <concise|detailed|raw>");
    expect(companyRssUsage).toContain("RSS 부가 필드 포함 수준");
    expect(companyRssUsage).toContain("raw도 RSS XML 전체를 반환하지 않습니다");
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
