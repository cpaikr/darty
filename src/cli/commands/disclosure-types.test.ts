import { describe, expect, test } from "bun:test";

import {
  createDisclosureTypesCommandWithRunner,
  disclosureTypesUsage,
  executeDisclosureTypesCommand,
  parseDisclosureTypesCommandArgs,
} from "./disclosure-types.ts";

describe("parseDisclosureTypesCommandArgs", () => {
  test("parses optional discovery filters", () => {
    expect(
      parseDisclosureTypesCommandArgs([
        "--category",
        "a",
        "--query",
        "사업보고서",
        "--pretty",
      ]),
    ).toEqual({
      request: {
        category: "A",
        query: "사업보고서",
      },
      output: { pretty: true },
    });
  });

  test("allows an empty command as the full menu request", () => {
    expect(parseDisclosureTypesCommandArgs([])).toEqual({
      request: {},
      output: { pretty: false },
    });
  });

  test("documents the helper CLI surface locally", () => {
    expect(disclosureTypesUsage).toContain("--category <A-J>");
    expect(disclosureTypesUsage).toContain("--query <text>");
    expect(disclosureTypesUsage).toContain("--pretty");
    expect(disclosureTypesUsage).toContain("darty disclosure-types");
    expect(disclosureTypesUsage).toContain("--disclosure-type");
    expect(disclosureTypesUsage).toContain("--report-name");
  });

  test("passes parsed semantic options to the command runner", async () => {
    let received: ReturnType<typeof parseDisclosureTypesCommandArgs> | undefined;
    const command = createDisclosureTypesCommandWithRunner(async (options) => {
      received = options;
    });

    await command.parseAsync(
      ["node", "disclosure-types", "--category", "I", "--query", "수시"],
      { from: "node" },
    );

    expect(received).toEqual({
      request: { category: "I", query: "수시" },
      output: { pretty: false },
    });
  });

  test("renders operation output as JSON", async () => {
    let stdout = "";
    await executeDisclosureTypesCommand(
      {
        request: { query: "A001" },
        output: { pretty: false },
      },
      {
        runOperation: async () => ({
          result: {
            request: { query: "A001" },
            totalCount: 1,
            categories: [
              {
                category: "A",
                items: [{ code: "A001", label: "사업보고서" }],
              },
            ],
          },
          metadata: {
            source: {
              system: "open-dart-docs",
              repository: "sjunepark/open-dart",
              commit: "85e7a07dee1d24cd810c705c1400c4ac3bbf6add",
              path: "src/docs/pblntf_detail_ty.md",
            },
            sourceBehavior: {
              codeSet: "pblntf_detail_ty",
              observationStatus: "source_material",
            },
            completeness: "complete",
          },
          references: {
            sourceUrl:
              "https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md",
          },
          warnings: [],
        }),
        writeStdout: (text) => {
          stdout = text;
        },
      },
    );

    expect(JSON.parse(stdout)).toMatchObject({
      result: {
        totalCount: 1,
        categories: [{ items: [{ code: "A001", label: "사업보고서" }] }],
      },
    });
  });
});
