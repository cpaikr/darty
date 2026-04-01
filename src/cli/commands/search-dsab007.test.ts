import { describe, expect, test } from "bun:test";

import { dsab007ContentsOperationSpec } from "../../tools/operations/dsab007-contents.ts";
import {
  buildDsab007ContentsSearchInput,
  createDsab007ContentsCommandWithRunner,
  dsab007Usage,
  executeDsab007ContentsCommand,
  parseDsab007CommandArgs,
} from "./search-dsab007.ts";

const formatFlags = ({
  cliFlags,
  valueHint,
}: (typeof dsab007ContentsOperationSpec.parameters)[number]) =>
  valueHint === undefined ? cliFlags.join(", ") : `${cliFlags.join(", ")} ${valueHint}`;

describe("parseDsab007CommandArgs", () => {
  test("rejects missing required arguments early", () => {
    expect(() => parseDsab007CommandArgs([])).toThrow(
      "required option '--keyword, --query <text>' not specified",
    );
  });

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
    ).toThrow("Allowed choices are DATE, rpt_nm.");
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
    ).toThrow("Allowed choices are asc, desc.");
  });

  test("rejects invalid integer options early", () => {
    expect(() =>
      parseDsab007CommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--page",
        "nope",
      ])
    ).toThrow(
      "option '--page, --current-page <number>' argument 'nope' is invalid. Expected an integer but received \"nope\".",
    );
  });

  test("accepts semantic aliases while preserving DART-shaped option keys", () => {
    const options = parseDsab007CommandArgs([
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
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
    expect(options.currentPage).toBe(2);
    expect(options.maxResults).toBe(25);
    expect(options.sortType).toBe("asc");
  });

  test("keeps help flags in sync with the shared operation spec", () => {
    for (const parameter of dsab007ContentsOperationSpec.parameters) {
      expect(dsab007Usage).toContain(formatFlags(parameter));
    }
  });

  test("renders parameter descriptions in CLI usage", () => {
    expect(dsab007Usage).toContain(
      "--presenter-name, --text-presenter-nm <text>",
    );
    expect(dsab007Usage).toContain(
      "Filter by presenter name when DART exposes that field. [observed]",
    );
    expect(dsab007Usage).toContain(
      "Semantic aliases are preferred when available; raw DART-shaped aliases remain accepted for debugging.",
    );
    expect(dsab007Usage).toContain(
      "The command always prints JSON to stdout and reserves stderr for errors.",
    );
  });

  test("builds a validated DART-shaped search input with defaults", () => {
    const input = buildDsab007ContentsSearchInput(
      parseDsab007CommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ]),
    );

    expect(input).toEqual({
      option: "contents",
      currentPage: 1,
      maxResults: 10,
      maxLinks: 10,
      sort: "DATE",
      sortType: "desc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      textCrpCik: undefined,
      textCrpNm: undefined,
      textPresenterNm: undefined,
      lateKeyword: undefined,
      flrCik: undefined,
      dspTypeTab: undefined,
      tocSrch: undefined,
      docType: undefined,
      reportName: undefined,
      decadeType: undefined,
    });
  });

  test("passes parsed options to the command runner", async () => {
    let received:
      | ReturnType<typeof parseDsab007CommandArgs>
      | undefined;

    const command = createDsab007ContentsCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "dsab007-contents",
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--company-name",
        "삼성전자",
        "--page",
        "2",
        "--sort-type",
        "asc",
      ],
      { from: "node" },
    );

    expect(received).toEqual({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      textCrpNm: "삼성전자",
      currentPage: 2,
      sortType: "asc",
    });
  });

  test("prints a single JSON payload for successful command execution", async () => {
    const writes: string[] = [];
    let receivedInput:
      | ReturnType<typeof buildDsab007ContentsSearchInput>
      | undefined;

    const result = {
      request: {
        option: "contents",
        currentPage: 2,
        maxResults: 10,
        maxLinks: 10,
        sort: "DATE",
        sortType: "desc",
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        textCrpCik: undefined,
        textCrpNm: undefined,
        textPresenterNm: undefined,
        lateKeyword: undefined,
        flrCik: undefined,
        dspTypeTab: undefined,
        tocSrch: undefined,
        docType: undefined,
        reportName: undefined,
        decadeType: undefined,
      },
      pagination: {
        currentPage: 2,
        totalPages: 3,
        totalCount: 21,
        returnedCount: 10,
      },
      rows: [],
      fetchedAt: "2026-03-31T00:00:00.000Z",
      sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
    } as const;

    const command = createDsab007ContentsCommandWithRunner((options) =>
      executeDsab007ContentsCommand(options, {
        runSearch: async (input) => {
          receivedInput = input;
          return result;
        },
        writeStdout: (text) => {
          writes.push(text);
        },
      }),
    );

    await command.parseAsync(
      [
        "node",
        "dsab007-contents",
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--page",
        "2",
      ],
      { from: "node" },
    );

    expect(receivedInput).toEqual(
      buildDsab007ContentsSearchInput({
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        currentPage: 2,
      }),
    );
    expect(writes).toEqual([JSON.stringify(result, null, 2)]);
  });
});
