import { describe, expect, test } from "bun:test";

import { createDartyPiTool, registerDartyPiTool } from "./pi.ts";
import { createDartyToolset, type DartyOperationName } from "./toolset.ts";

const createMockToolset = () =>
  createDartyToolset({
    operations: [
      {
        name: "disclosure-types" as DartyOperationName,
        label: "공시유형 목업",
        description: "공시유형 목업 조회입니다.",
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

describe("Darty Pi single-tool adapter", () => {
  test("registers only the single darty tool by default", () => {
    const registered: unknown[] = [];

    registerDartyPiTool(
      { registerTool: (tool) => registered.push(tool) },
      { toolset: createMockToolset() },
    );

    expect(registered.map((tool) => (tool as { name: string }).name)).toEqual([
      "darty",
    ]);

    const [tool] = registered as ReturnType<typeof createDartyPiTool>[];
    expect(tool).toBeDefined();
    expect(tool!.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["action"],
      properties: {
        action: { enum: ["help", "command_help", "validate", "run"] },
        command: { enum: expect.arrayContaining(["disclosure-types"]) },
        inputJson: { type: "object" },
      },
    });
    expect(tool!.promptGuidelines.join("\n")).toContain("action=run");
  });

  test("returns source-level help and command names in model-facing content", async () => {
    const tool = createDartyPiTool({ toolset: createMockToolset() });

    await expect(tool.execute("call-1", { action: "help" })).resolves.toMatchObject({
      content: [
        {
          type: "text",
          text: expect.stringContaining("disclosure-types"),
        },
      ],
      details: {
        ok: true,
        action: "help",
        help: { operations: [{ name: "disclosure-types" }] },
      },
    });
  });

  test("returns command help with schema, examples, limitations, and result summary", async () => {
    const tool = createDartyPiTool({ toolset: createMockToolset() });

    await expect(
      tool.execute("call-1", { action: "command_help", command: "disclosure-types" }),
    ).resolves.toMatchObject({
      content: [
        {
          type: "text",
          text: expect.stringContaining("입력 JSON Schema"),
        },
      ],
      details: {
        ok: true,
        action: "command_help",
        command: "disclosure-types",
        commandHelp: {
          inputJsonSchema: { properties: { query: { type: "string" } } },
          examples: expect.any(Array),
          resultSummary: expect.any(String),
        },
      },
    });
  });

  test("validates and normalizes without live DART execution", async () => {
    let executed = false;
    const tool = createDartyPiTool({
      toolset: createDartyToolset({
        operations: [
          {
            name: "disclosure-types" as DartyOperationName,
            label: "공시유형 목업",
            description: "공시유형 목업 조회입니다.",
            operation: {
              name: "disclosure-types",
              inputJsonSchema: { type: "object" },
              resultJsonSchema: { type: "object" },
              execute: async () => {
                executed = true;
                return {};
              },
            },
          },
        ],
      }),
    });

    await expect(
      tool.execute("call-1", {
        action: "validate",
        command: "disclosure-types",
        inputJson: { query: "사업보고서" },
      }),
    ).resolves.toMatchObject({
      content: [{ type: "text", text: expect.stringContaining("정규화된 입력") }],
      details: {
        ok: true,
        action: "validate",
        command: "disclosure-types",
        validation: { input: { query: "사업보고서" } },
      },
    });
    expect(executed).toBe(false);
  });

  test("returns Darty-owned validation failure fields", async () => {
    const tool = createDartyPiTool({ toolset: createMockToolset() });

    await expect(
      tool.execute("call-1", {
        action: "validate",
        command: "search-company",
        inputJson: {},
      }),
    ).resolves.toMatchObject({
      content: [
        {
          type: "text",
          text: expect.stringContaining("수정 참고 정보"),
        },
      ],
      details: {
        ok: false,
        action: "validate",
        command: "search-company",
        error: {
          code: "invalid_request",
          parameter: "name",
          reason: "unknown_operation",
          operationName: "search-company",
          recoveryHint: expect.stringContaining("표준"),
          retryable: true,
          recoveryAction: { kind: "inspect_tool_help" },
        },
      },
    });
  });

  test("validates before run, executes normalized input, and returns full envelope in content and details", async () => {
    const tool = createDartyPiTool({ toolset: createMockToolset() });

    const result = await tool.execute("call-1", {
      action: "run",
      command: "disclosure-types",
      inputJson: { query: "사업보고서" },
    });

    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          text: expect.stringContaining("mock://dart/disclosure-types"),
        },
      ],
      details: {
        ok: true,
        action: "run",
        command: "disclosure-types",
        normalizedInput: { query: "사업보고서" },
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
    const tool = createDartyPiTool({
      toolset: {
        id: "darty",
        label: "Darty",
        description: "Darty 목업",
        help: () => ({
          id: "darty",
          label: "Darty",
          description: "Darty 목업",
          usage: "목업",
          operations: [],
          limitations: [],
          citationGuidance: [],
        }),
        listOperations: () => [],
        getCommandHelp: () => undefined,
        validateInput: (_name, input) => ({ ok: true, input: input as Record<string, unknown> }),
        execute: async (_name, _input, context) => {
          receivedSignal = context?.signal;
          return { result: {}, metadata: {}, references: {}, warnings: [] };
        },
      },
    });

    await tool.execute(
      "call-1",
      { action: "run", command: "disclosure-types", inputJson: {} },
      controller.signal,
    );

    expect(receivedSignal).toBe(controller.signal);
  });

  test("preserves structural execution error fields", async () => {
    const tool = createDartyPiTool({
      toolset: {
        id: "darty",
        label: "Darty",
        description: "Darty 목업",
        help: () => ({
          id: "darty",
          label: "Darty",
          description: "Darty 목업",
          usage: "목업",
          operations: [],
          limitations: [],
          citationGuidance: [],
        }),
        listOperations: () => [],
        getCommandHelp: () => undefined,
        validateInput: (_name, input) => ({ ok: true, input: input as Record<string, unknown> }),
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
    });

    await expect(
      tool.execute("call-1", { action: "run", command: "search-body", inputJson: {} }),
    ).resolves.toMatchObject({
      details: {
        ok: false,
        action: "run",
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
