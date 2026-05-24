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
    expect(disclosureTypesUsage).toContain("B=주요사항보고");
    expect(disclosureTypesUsage).toContain("H=자산유동화");
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
                categoryLabel: "정기공시",
                categoryDescription:
                  "Periodic filing family, including 사업보고서, 반기보고서, and 분기보고서.",
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
            categoryLabelSource: {
              system: "dart-fss-docs",
              url: "https://dart-fss.readthedocs.io/en/latest/dart_types.html",
              codeSet: "pblntf_ty",
            },
            categoryDescriptionProvenance: {
              status: "implementation_authored_guidance",
              basis:
                "Human-authored summaries derived from pblntf_ty category labels and pblntf_detail_ty items.",
            },
            sourceBehavior: {
              codeSet: "pblntf_detail_ty",
              categoryCodeSet: "pblntf_ty",
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
