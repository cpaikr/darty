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
    expect(companyDetailUsage).toContain("DART 기업개황 detail");
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new CompanyDetailFailure({
      code: "invalid_request",
      message: 'Missing required parameter "companyCode". Expected 8-digit DART company code.',
      parameter: "companyCode",
      retryable: false,
    });

    expect(renderCompanyDetailCliErrorMessage(error)).toBe(
      'Missing required option "--company-code". Expected 8-digit DART company code.',
    );
  });
});
