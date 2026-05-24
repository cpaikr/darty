import { describe, expect, test } from "bun:test";

import {
  createDartyToolset,
  DartyToolsetError,
  dartySingleToolActions,
  dartySingleToolCopy,
  formatDartyToolsetHelp,
  type DartyOperationName,
  type DartyValidationFailure,
} from "./toolset.ts";

const expectedOperationNames: readonly DartyOperationName[] = [
  "search-body",
  "search-company",
  "search-company-reports",
  "company-detail",
  "company-rss",
  "disclosure-types",
  "report-guide",
  "view-report",
];

type AssertFalse<T extends false> = T;
type RetryableValidationFailureWithoutRecoveryAction = {
  readonly code: "invalid_request";
  readonly message: "Missing recovery action";
  readonly retryable: true;
};
type RetryableValidationFailureRequiresRecoveryAction = AssertFalse<
  RetryableValidationFailureWithoutRecoveryAction extends DartyValidationFailure
    ? true
    : false
>;

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

  test("returns operation details with help, schemas, examples, and required keys", () => {
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
      requiredInputKeys: ["companyName"],
      examples: [{ companyName: "삼성전자", page: 1, pageSize: 15 }],
      resultSummary: expect.stringContaining("search-company"),
    });
    expect(searchCompany?.description).toContain("DART");
    expect(toolset.getCommandHelp("search-company")).toEqual(searchCompany);
    expect(toolset.getOperation("darty_search_company")).toBeUndefined();
  });

  test("returns source-level help and reusable single-tool copy", () => {
    const toolset = createDartyToolset();
    const help = toolset.help();

    expect(help.id).toBe("darty");
    expect(help.label).toBe("Dart 검색");
    expect(help.operations.map((operation) => operation.name)).toContain("search-body");
    expect(help.limitations.join("\n")).toContain("OpenDART");
    expect(help.citationGuidance.join("\n")).toContain("result.references");
    expect(help.usage).toContain("validateInput");
    expect(dartySingleToolActions).toEqual([
      "help",
      "command_help",
      "validate",
      "run",
    ]);
    expect(dartySingleToolCopy.promptGuidelines.join("\n")).toContain("action=run");
    expect(formatDartyToolsetHelp(help)).toContain("사용 형식: darty(action");
  });

  test("validates and prepares input without executing DART lookups", () => {
    const toolset = createDartyToolset();

    expect(
      toolset.validateInput("search-company", { companyName: " 삼성전자 " }),
    ).toEqual({
      ok: true,
      input: { companyName: "삼성전자", page: 1, pageSize: 15 },
    });

    expect(toolset.validateInput("search-company", {})).toMatchObject({
      ok: false,
      error: {
        code: "missing_parameter",
        operationName: "search-company",
        parameter: "companyName",
        reason: "required",
        expected: "string_min_length_2",
        message: expect.stringContaining("companyName"),
        exampleInput: { companyName: "삼성전자", page: 1, pageSize: 15 },
        retryable: true,
        recoveryAction: {
          kind: "inspect_command_help",
          operationName: "search-company",
        },
      },
    });

    expect(toolset.validateInput("search-company", null)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_parameter",
        operationName: "search-company",
        parameter: "input",
        reason: "invalid_type",
        actual: null,
        exampleInput: { companyName: "삼성전자", page: 1, pageSize: 15 },
        retryable: true,
        recoveryAction: {
          kind: "inspect_command_help",
          operationName: "search-company",
        },
      },
    });

    expect(toolset.validateInput("view-report", null)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_parameter",
        operationName: "view-report",
        parameter: "input",
        reason: "invalid_type",
        actual: null,
      },
    });

    expect(
      toolset.validateInput("search-company-reports", {
        companyCode: "삼성전자",
        startDate: "20260501",
        endDate: "20260531",
      }),
    ).toMatchObject({
      ok: false,
      error: {
        code: "invalid_parameter",
        parameter: "companyCode",
        recoveryHint: expect.stringContaining("search-company"),
        retryable: true,
        recoveryAction: {
          kind: "inspect_command_help",
          operationName: "search-company-reports",
        },
      },
    });

    expect(
      toolset.validateInput("search-body", {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        sortBy: "companyName",
      }),
    ).toMatchObject({
      ok: false,
      error: {
        code: "invalid_parameter",
        operationName: "search-body",
        parameter: "sortBy",
        reason: "invalid_choice",
        retryable: true,
        recoveryAction: {
          kind: "inspect_command_help",
          operationName: "search-body",
        },
      },
    });
  });

  test("serializes errors structurally across class boundaries", () => {
    const toolset = createDartyToolset();
    const error = new Error("Mock source failure") as Error & {
      code: string;
      retryable: boolean;
      parameter: string;
      sourceUrl: string;
      recoveryHint: string;
      operationName: string;
    };
    error.code = "source_unavailable";
    error.retryable = true;
    error.parameter = "keyword";
    error.sourceUrl = "mock://dart/search";
    error.recoveryHint = "Try again later.";
    error.operationName = "search-body";

    expect(toolset.serializeError(error)).toEqual({
      name: "Error",
      message: "Mock source failure",
      code: "source_unavailable",
      retryable: true,
      parameter: "keyword",
      sourceUrl: "mock://dart/search",
      recoveryHint: "Try again later.",
      operationName: "search-body",
    });

    expect(toolset.validateInput("not-a-command", {})).toMatchObject({
      ok: false,
      error: {
        code: "invalid_request",
        parameter: "name",
        reason: "unknown_operation",
        operationName: "not-a-command",
        retryable: true,
        recoveryAction: { kind: "inspect_tool_help" },
      },
    });
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
          label: "공시유형 목업",
          description: "목업 작업입니다.",
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

    expect(toolset.validateInput("disclosure-types", null)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_parameter",
        operationName: "disclosure-types",
        parameter: "input",
        reason: "invalid_type",
        expected: "object",
        actual: null,
        retryable: true,
        recoveryAction: {
          kind: "inspect_command_help",
          operationName: "disclosure-types",
        },
      },
    });

    expect(toolset.validateInput("disclosure-types", { category: "A" })).toEqual({
      ok: true,
      input: { category: "A" },
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
