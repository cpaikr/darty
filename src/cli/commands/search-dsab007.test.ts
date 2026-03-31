import { describe, expect, test } from "bun:test";

import { parseDsab007CommandArgs } from "./search-dsab007.ts";

describe("parseDsab007CommandArgs", () => {
  test("parses the observed contents sort unions", () => {
    const options = parseDsab007CommandArgs([
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--sort",
      "DATE",
      "--sort-type",
      "desc",
    ]);

    expect(options.sort).toBe("DATE");
    expect(options.sortType).toBe("desc");
  });

  test("rejects unsupported sort fields early", () => {
    expect(() =>
      parseDsab007CommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--sort",
        "crp",
      ])
    ).toThrow('Invalid --sort "crp". Expected one of: DATE, rpt_nm.');
  });

  test("rejects unsupported sort directions early", () => {
    expect(() =>
      parseDsab007CommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--sort-type",
        "down",
      ])
    ).toThrow('Invalid --sort-type "down". Expected one of: asc, desc.');
  });
});
