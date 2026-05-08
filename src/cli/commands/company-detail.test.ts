import { describe, expect, test } from "bun:test";

import {
  CompanyDetailFailure,
  resolveCompanyDetailRequest,
} from "../../capabilities/company-detail/contract.ts";
import {
  parseCompanyDetailCommandArgs,
  renderCompanyDetailCliErrorMessage,
  companyDetailUsage,
} from "./company-detail.ts";

describe("parseCompanyDetailCommandArgs", () => {
  test("parses company code flag", () => {
    expect(parseCompanyDetailCommandArgs(["--company-code", "00126380"])).toEqual({
      request: { companyCode: "00126380" },
      output: { pretty: false },
    });
  });

  test("resolves parsed options through the shared resolver", () => {
    expect(
      resolveCompanyDetailRequest(
        parseCompanyDetailCommandArgs(["--company-code", "00126380"]).request,
      ),
    ).toEqual({ companyCode: "00126380" });
  });

  test("documents the CLI surface", () => {
    expect(companyDetailUsage).toContain("--company-code <text>");
    expect(companyDetailUsage).toContain("기업개황 상세");
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new CompanyDetailFailure({
      code: "invalid_request",
      message:
        '필수 매개변수 "companyCode"이(가) 없습니다. 필요한 값: 8자리 DART 회사 코드.',
      parameter: "companyCode",
      retryable: false,
    });

    expect(renderCompanyDetailCliErrorMessage(error)).toBe(
      '필수 옵션 "--company-code"이(가) 없습니다. 필요한 값: 8자리 DART 회사 코드.',
    );
  });
});
