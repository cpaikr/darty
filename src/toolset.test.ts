import { describe, expect, test } from "bun:test";

import {
  createDartyToolset,
  DartyToolsetError,
  type DartyOperationName,
} from "./toolset.ts";

const expectedOperationNames: readonly DartyOperationName[] = [
  "search-body",
  "search-company",
  "search-company-reports",
  "company-detail",
  "company-rss",
  "disclosure-types",
  "view-report",
];

describe("Darty neutral toolset", () => {
  test("lists stable canonical operation names", () => {
    const toolset = createDartyToolset();

    expect(toolset.id).toBe("darty");
    expect(toolset.listOperations().map((operation) => operation.name)).toEqual(
      [...expectedOperationNames],
    );
    expect(
      toolset
        .listOperations()
        .every(
          (operation) => operation.label.length > 0 && operation.description.length > 0,
        ),
    ).toBe(true);
  });

  test("returns operation details with input and result schemas", () => {
    const toolset = createDartyToolset();
    const searchCompany = toolset.getOperation("search-company");

    expect(searchCompany).toMatchObject({
      name: "search-company",
      inputJsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["companyName"],
      },
      resultJsonSchema: {
        type: "object",
        required: ["result", "metadata", "references", "warnings"],
      },
    });
    expect(searchCompany?.description).toContain("DART");
    expect(toolset.getOperation("darty_search_company")).toBeUndefined();
  });

  test("executes through the operation and preserves result envelope fields", async () => {
    const toolset = createDartyToolset();
    const result = await toolset.execute("disclosure-types", { query: "사업보고서" });

    expect(result).toMatchObject({
      result: {
        request: { query: "사업보고서" },
      },
    });
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("references");
    expect(result).toHaveProperty("warnings");
    expect(Array.isArray((result as { warnings?: unknown }).warnings)).toBe(true);
  });

  test("delegates custom operations for host tests without DART access", async () => {
    const toolset = createDartyToolset({
      operations: [
        {
          name: "disclosure-types" as DartyOperationName,
          label: "Mock disclosure types",
          description: "Mock operation",
          operation: {
            name: "disclosure-types",
            inputJsonSchema: { type: "object" },
            resultJsonSchema: { type: "object" },
            execute: async (input) => ({
              result: { request: input, items: [] },
              metadata: { source: "mock" },
              references: { sourceUrl: "mock://darty" },
              warnings: [],
            }),
          },
        },
      ],
    });

    await expect(toolset.execute("disclosure-types", { category: "A" })).resolves.toMatchObject({
      result: { request: { category: "A" }, items: [] },
      references: { sourceUrl: "mock://darty" },
      warnings: [],
    });
  });

  test("throws a typed error for unknown operations", async () => {
    const toolset = createDartyToolset();

    await expect(toolset.execute("not-a-darty-operation", {})).rejects.toMatchObject({
      name: "DartyToolsetError",
      code: "unknown_operation",
      retryable: false,
      operationName: "not-a-darty-operation",
    });

    try {
      await toolset.execute("not-a-darty-operation", {});
    } catch (error) {
      expect(error).toBeInstanceOf(DartyToolsetError);
    }
  });
});
