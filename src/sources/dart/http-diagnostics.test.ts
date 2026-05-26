import { describe, expect, test } from "bun:test";

import { createDartSourceTextResponse } from "./source-response.ts";
import { toParseFailureDiagnostics } from "./http-diagnostics.ts";

describe("toParseFailureDiagnostics", () => {
  test("preserves HTTP metadata from source responses", () => {
    const response = createDartSourceTextResponse(
      "<html></html>",
      "https://dart.fss.or.kr/sample.ax",
      {
        httpStatus: 200,
        httpContentType: "text/html;charset=UTF-8",
        httpResponseLength: 13,
      },
    );

    expect(
      toParseFailureDiagnostics({
        reason: "source schema mismatch",
        response,
        cause: new Error("missing total count"),
      }),
    ).toEqual({
      parseReason: "source schema mismatch",
      httpStatus: 200,
      httpContentType: "text/html;charset=UTF-8",
      httpResponseLength: 13,
      cause: {
        name: "Error",
        message: "missing total count",
      },
    });
  });
});
