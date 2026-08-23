import { describe, expect, test } from "bun:test";

import { SourceChanged } from "../../errors.ts";
import { buildReportViewerUrl } from "./fetch.ts";

describe("buildReportViewerUrl", () => {
  test("replays valid locator fields without rewriting them", () => {
    const url = new URL(
      buildReportViewerUrl({
        rcpNo: "00000000000001",
        dcmNo: "00000042",
        eleId: "0007",
        offset: "000010",
        length: "000020",
        dtd: "dart4.xsd",
      }),
    );

    expect(Object.fromEntries(url.searchParams)).toEqual({
      rcpNo: "00000000000001",
      dcmNo: "00000042",
      eleId: "0007",
      offset: "000010",
      length: "000020",
      dtd: "dart4.xsd",
    });
  });

  test("rejects malformed locators instead of sanitizing them", () => {
    expect(() =>
      buildReportViewerUrl({
        rcpNo: "20260331004166",
        dcmNo: "11213016",
        eleId: "1",
        offset: "10oops",
        length: "20",
        dtd: "dart4.xsd",
      }),
    ).toThrow(SourceChanged);
  });
});
