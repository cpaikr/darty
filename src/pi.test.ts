import { describe, expect, test } from "bun:test";

import { createDartyPiTools, registerDartyPiTools } from "./pi.ts";
import { createDartyToolset, type DartyOperationName } from "./toolset.ts";

const createMockToolset = () =>
  createDartyToolset({
    operations: [
      {
        name: "disclosure-types" as DartyOperationName,
        label: "Mock disclosure types",
        description: "Mock disclosure type lookup.",
        operation: {
          name: "disclosure-types",
          inputJsonSchema: {
            type: "object",
            additionalProperties: false,
            properties: { query: { type: "string" } },
          },
          resultJsonSchema: { type: "object" },
          execute: async (input) => ({
            result: { request: input, items: [{ code: "A001", label: "사업보고서" }] },
            metadata: { source: { system: "dart" } },
            references: { sourceUrl: "mock://dart/disclosure-types" },
            warnings: [],
          }),
        },
      },
    ],
  });

describe("Darty Pi progressive adapter", () => {
  test("registers progressive tools with expected names and schemas", () => {
    const registered: unknown[] = [];

    registerDartyPiTools(
      { registerTool: (tool) => registered.push(tool) },
      { toolset: createMockToolset() },
    );

    expect(
      registered.map((tool) => (tool as { name: string }).name),
    ).toEqual([
      "darty_list_operations",
      "darty_get_operation_details",
      "darty_run_operation",
      "darty_get_help",
    ]);

    const detailTool = registered.find(
      (tool) => (tool as { name: string }).name === "darty_get_operation_details",
    ) as { parameters: unknown; promptSnippet: string; promptGuidelines: readonly string[] };
    const runTool = registered.find(
      (tool) => (tool as { name: string }).name === "darty_run_operation",
    ) as { parameters: unknown; promptSnippet: string; promptGuidelines: readonly string[] };

    expect(detailTool.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: { name: { enum: expect.arrayContaining(["disclosure-types"]) } },
    });
    expect(runTool.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["name", "input"],
    });
    expect(detailTool.promptSnippet).toContain("darty_get_operation_details");
    expect(runTool.promptGuidelines.join("\n")).toContain("darty_run_operation");
  });

  test("lists, describes, and runs one operation", async () => {
    const tools = createDartyPiTools({ toolset: createMockToolset(), includeHelpTool: false });
    const list = tools.find((tool) => tool.name === "darty_list_operations");
    const details = tools.find((tool) => tool.name === "darty_get_operation_details");
    const run = tools.find((tool) => tool.name === "darty_run_operation");

    expect(list).toBeDefined();
    expect(details).toBeDefined();
    expect(run).toBeDefined();

    await expect(list!.execute("call-1", {})).resolves.toMatchObject({
      content: [{ type: "text", text: expect.stringContaining("disclosure-types") }],
      details: { operations: [{ name: "disclosure-types" }] },
    });

    await expect(
      details!.execute("call-2", { name: "disclosure-types" }),
    ).resolves.toMatchObject({
      content: [{ type: "text", text: expect.stringContaining("Input schema") }],
      details: {
        ok: true,
        operation: {
          name: "disclosure-types",
          inputJsonSchema: { properties: { query: { type: "string" } } },
        },
      },
    });

    await expect(
      run!.execute("call-3", { name: "disclosure-types", input: { query: "사업보고서" } }),
    ).resolves.toMatchObject({
      content: [{ type: "text", text: expect.stringContaining("1 item") }],
      details: {
        ok: true,
        operationName: "disclosure-types",
        result: {
          result: { request: { query: "사업보고서" } },
          references: { sourceUrl: "mock://dart/disclosure-types" },
          warnings: [],
        },
      },
    });
  });

  test("passes Pi abort signals into toolset execution", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const [run] = createDartyPiTools({
      includeHelpTool: false,
      toolset: {
        id: "darty",
        label: "Darty",
        description: "Mock Darty",
        listOperations: () => [],
        getOperation: () => undefined,
        execute: async (_name, _input, context) => {
          receivedSignal = context?.signal;
          return { result: {}, metadata: {}, references: {}, warnings: [] };
        },
      },
    }).filter((tool) => tool.name === "darty_run_operation");

    await run!.execute(
      "call-1",
      { name: "disclosure-types", input: {} },
      controller.signal,
    );

    expect(receivedSignal).toBe(controller.signal);
  });

  test("returns typed error details from the progressive run tool", async () => {
    const run = createDartyPiTools({ toolset: createMockToolset(), includeHelpTool: false }).find(
      (tool) => tool.name === "darty_run_operation",
    );

    await expect(
      run!.execute("call-1", { name: "search-body", input: {} }),
    ).resolves.toMatchObject({
      details: {
        ok: false,
        operationName: "search-body",
        error: {
          name: "DartyToolsetError",
          code: "unknown_operation",
          retryable: false,
          operationName: "search-body",
        },
      },
    });
  });

  test("preserves structural error fields without relying on class identity", async () => {
    const run = createDartyPiTools({
      includeHelpTool: false,
      toolset: {
        id: "darty",
        label: "Darty",
        description: "Mock Darty",
        listOperations: () => [],
        getOperation: () => undefined,
        execute: async () => {
          const error = new Error("Mock operation failed") as Error & {
            code: string;
            operationName: string;
            parameter: string;
            retryable: boolean;
            sourceUrl: string;
            recoveryHint: string;
          };
          error.code = "mock_failure";
          error.operationName = "search-body";
          error.parameter = "keyword";
          error.retryable = false;
          error.sourceUrl = "mock://dart/search";
          error.recoveryHint = "Use a different keyword.";
          throw error;
        },
      },
    }).find((tool) => tool.name === "darty_run_operation");

    await expect(
      run!.execute("call-1", { name: "search-body", input: {} }),
    ).resolves.toMatchObject({
      details: {
        ok: false,
        error: {
          code: "mock_failure",
          operationName: "search-body",
          parameter: "keyword",
          retryable: false,
          sourceUrl: "mock://dart/search",
          recoveryHint: "Use a different keyword.",
        },
      },
    });
  });
});
