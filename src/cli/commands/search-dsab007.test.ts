import { describe, expect, test } from "bun:test";

import {
  dsab007Usage,
  parseDsab007CommandArgs,
} from "./search-dsab007.ts";

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

  test("accepts semantic aliases while preserving DART-shaped option keys", () => {
    const options = parseDsab007CommandArgs([
      "--company-name",
      "삼성전자",
      "--presenter-name",
      "IR",
      "--page",
      "2",
      "--limit",
      "25",
      "--sort-direction",
      "asc",
    ]);

    expect(options.textCrpNm).toBe("삼성전자");
    expect(options.textPresenterNm).toBe("IR");
    expect(options.currentPage).toBe("2");
    expect(options.maxResults).toBe("25");
    expect(options.sortType).toBe("asc");
  });

  test("renders parameter descriptions in CLI usage", () => {
    expect(dsab007Usage).toContain(
      "--presenter-name <text>, --text-presenter-nm <text>",
    );
    expect(dsab007Usage).toContain(
      "Filter by presenter name when DART exposes that field. [observed]",
    );
    expect(dsab007Usage).toContain(
      "Semantic flags are preferred when available; raw DART aliases remain accepted for debugging.",
    );
  });
});
