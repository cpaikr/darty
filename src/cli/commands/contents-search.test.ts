import { describe, expect, test } from "bun:test";

import { contentsSearchOperationSpec } from "../../tools/operations/contents-search.ts";
import {
  InvalidContentsSearchInput,
  resolveContentsSearchInput,
} from "../../tools/operations/contents-search-input.ts";
import {
  createContentsSearchCommandWithRunner,
  contentsSearchUsage,
  executeContentsSearchCommand,
  parseContentsSearchCommandArgs,
} from "./contents-search.ts";
import type { OperationParameter } from "../../tools/operations/types.ts";

const formatFlags = ({
  cliFlags,
  valueHint,
}: OperationParameter) =>
  valueHint === undefined ? cliFlags.join(", ") : `${cliFlags.join(", ")} ${valueHint}`;

describe("parseContentsSearchCommandArgs", () => {
  test("parses semantic flags into semantic keys", () => {
    const options = parseContentsSearchCommandArgs([
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
      "--sort-by",
      "reportName",
      "--sort-direction",
      "asc",
    ]);

    expect(options).toEqual({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyName: "삼성전자",
      presenterName: "IR",
      page: 2,
      limit: 25,
      sortBy: "reportName",
      sortDirection: "asc",
    });
  });

  test("parses transport syntax without enforcing required fields", () => {
    expect(parseContentsSearchCommandArgs([])).toEqual({});
  });

  test("rejects invalid integer options early", () => {
    expect(() =>
      parseContentsSearchCommandArgs([
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
      "option '--page <number>' argument 'nope' is invalid. Expected an integer but received \"nope\".",
    );
  });

  test("keeps help flags in sync with the shared operation spec", () => {
    for (const parameter of contentsSearchOperationSpec.parameters) {
      expect(contentsSearchUsage).toContain(formatFlags(parameter));
    }
  });

  test("renders semantic parameter descriptions in CLI usage", () => {
    expect(contentsSearchUsage).toContain("--company-name <text>");
    expect(contentsSearchUsage).toContain("Filter by company name as shown in DART search.");
    expect(contentsSearchUsage).toContain("[observed]");
    expect(contentsSearchUsage).toContain(
      "The command accepts semantic parameter names only; DART replay field names stay internal.",
    );
    expect(contentsSearchUsage).not.toContain("text-crp-nm");
    expect(contentsSearchUsage).not.toContain("--query");
  });

  test("resolves parsed options through the shared semantic resolver", () => {
    const request = resolveContentsSearchInput(
      parseContentsSearchCommandArgs([
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ]) as Record<string, unknown>,
    );

    expect(request).toEqual({
      page: 1,
      limit: 10,
      maxLinks: 10,
      sortBy: "date",
      sortDirection: "desc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: undefined,
      companyName: undefined,
      presenterName: undefined,
      secondaryKeyword: undefined,
      filerCode: undefined,
      disclosureTypeTab: undefined,
      tocSearch: undefined,
      documentType: undefined,
      reportName: undefined,
      decadeType: undefined,
    });
  });

  test("passes parsed semantic options to the command runner", async () => {
    let received:
      | ReturnType<typeof parseContentsSearchCommandArgs>
      | undefined;

    const command = createContentsSearchCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      [
        "node",
        "contents-search",
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
        "--sort-direction",
        "asc",
      ],
      { from: "node" },
    );

    expect(received).toEqual({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyName: "삼성전자",
      page: 2,
      sortDirection: "asc",
    });
  });

  test("rejects invalid semantic input before execution", async () => {
    try {
      await executeContentsSearchCommand({
        startDate: "20250331",
        endDate: "20260331",
      });
      throw new Error("Expected execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentsSearchInput);

      if (!(error instanceof InvalidContentsSearchInput)) {
        throw error;
      }

      expect(error.code).toBe("missing_parameter");
      expect(error.parameter).toBe("keyword");
      expect(error.message).toBe(
        'Missing required parameter "keyword". Expected a non-empty string.',
      );
    }
  });

  test("prints a single JSON payload with the semantic request", async () => {
    const writes: string[] = [];
    let receivedInput:
      | Record<string, unknown>
      | undefined;

    const result = {
      request: {
        page: 2,
        limit: 10,
        maxLinks: 10,
        sortBy: "date",
        sortDirection: "desc",
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: undefined,
        companyName: undefined,
        presenterName: undefined,
        secondaryKeyword: undefined,
        filerCode: undefined,
        disclosureTypeTab: undefined,
        tocSearch: undefined,
        documentType: undefined,
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

    const command = createContentsSearchCommandWithRunner((options) =>
      executeContentsSearchCommand(options, {
        runOperation: async (input) => {
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
        "contents-search",
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
      {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        page: 2,
      },
    );
    expect(writes).toEqual([JSON.stringify(result, null, 2)]);
  });
});
