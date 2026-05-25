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
    expect(companyRssUsage).toContain("Supplemental RSS field");
    expect(companyRssUsage).toContain("raw still does not return full RSS XML");
    expect(companyRssUsage).toContain("RSS");
  });

  test("renders CLI-facing validation errors with flag names", () => {
    const error = new CompanyRssFailure({
      code: "invalid_request",
      message: 'Missing required parameter "companyCode". Expected 8-digit DART company code.',
      parameter: "companyCode",
      retryable: false,
    });

    expect(renderCompanyRssCliErrorMessage(error)).toBe(
      'Missing required option "--company-code". Expected 8-digit DART company code.',
    );
  });
});
