import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import {
  defaultContentsSearchOperation,
  type ContentsSearchOperation,
} from "../app/contents-search.ts";
import {
  defaultReportViewOperation,
  type ReportViewOperation,
} from "../app/report-view.ts";
import {
  contentsSearchMcpCopy,
  contentsSearchToolCopy,
} from "../capabilities/contents-search/copy.ts";
import { ContentsSearchFailure } from "../capabilities/contents-search/contract.ts";
import {
  reportViewMcpCopy,
  reportViewToolCopy,
} from "../capabilities/report-view/copy.ts";
import { ReportViewFailure } from "../capabilities/report-view/contract.ts";
import { dartyMcpCopy } from "./copy.ts";

const serverInfo = {
  name: "darty",
  version: "0.1.0",
} as const;

type DartyMcpOperations = {
  readonly contentsSearch: ContentsSearchOperation;
  readonly reportView: ReportViewOperation;
};

type DartyMcpServerOptions = {
  readonly operations?: Partial<DartyMcpOperations>;
};

const defaultOperations: DartyMcpOperations = {
  contentsSearch: defaultContentsSearchOperation,
  reportView: defaultReportViewOperation,
};

type DartyMcpOperation = {
  readonly name: string;
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type DartyMcpToolRegistration = {
  readonly operation: DartyMcpOperation;
  readonly title: string;
  readonly description: string;
  readonly instructions: string;
  readonly toFailureResult: (error: unknown) => CallToolResult | undefined;
};

type JsonObjectToolSchema = Tool["inputSchema"];

const toObjectToolSchema = (schemaValue: unknown): JsonObjectToolSchema => {
  const schema = schemaValue as Partial<JsonObjectToolSchema> &
    Record<string, unknown>;

  if (schema.type !== "object") {
    throw new Error("Darty MCP tool schemas must have an object root.");
  }

  return schema as JsonObjectToolSchema;
};

const serializeToolPayload = (value: unknown): string =>
  JSON.stringify(value, null, 2);

const toFailureResult = (error: { readonly message: string }): CallToolResult => ({
  content: [{ type: "text", text: error.message }],
  isError: true,
});

const createToolDefinition = (
  registration: DartyMcpToolRegistration,
): Tool => ({
  name: registration.operation.name,
  title: registration.title,
  description: registration.description,
  inputSchema: toObjectToolSchema(registration.operation.inputJsonSchema),
  outputSchema: toObjectToolSchema(registration.operation.resultJsonSchema),
  annotations: {
    title: registration.title,
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
});

const handleToolCall = async (
  registration: DartyMcpToolRegistration,
  args: Record<string, unknown>,
): Promise<CallToolResult> => {
  try {
    const result = await registration.operation.execute(args);

    return {
      content: [{ type: "text", text: serializeToolPayload(result) }],
      structuredContent: result as Record<string, unknown>,
    };
  } catch (error) {
    const failureResult = registration.toFailureResult(error);

    if (failureResult !== undefined) {
      return failureResult;
    }

    throw error;
  }
};

const createToolRegistrations = (
  operations: DartyMcpOperations,
): readonly DartyMcpToolRegistration[] => [
  {
    operation: operations.contentsSearch,
    title: contentsSearchToolCopy.title,
    description: contentsSearchToolCopy.description,
    instructions: contentsSearchMcpCopy.instructions,
    toFailureResult: (error) =>
      error instanceof ContentsSearchFailure ? toFailureResult(error) : undefined,
  },
  {
    operation: operations.reportView,
    title: reportViewToolCopy.title,
    description: reportViewToolCopy.description,
    instructions: reportViewMcpCopy.instructions,
    toFailureResult: (error) =>
      error instanceof ReportViewFailure ? toFailureResult(error) : undefined,
  },
];

const combineInstructions = (
  registrations: readonly DartyMcpToolRegistration[],
): string =>
  registrations
    .map((registration) => registration.instructions.trim())
    .filter((instructions) => instructions.length > 0)
    .join("\n\n");

export const createDartyMcpServer = (
  options?: DartyMcpServerOptions,
): Server => {
  const operations = {
    ...defaultOperations,
    ...options?.operations,
  } satisfies DartyMcpOperations;
  const toolRegistrations = createToolRegistrations(operations);
  const toolDefinitions = toolRegistrations.map(createToolDefinition);
  const server = new Server(serverInfo, {
    capabilities: {
      tools: {},
    },
    instructions: combineInstructions(toolRegistrations),
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const registration = toolRegistrations.find(
      (candidate) => candidate.operation.name === name,
    );

    if (registration === undefined) {
      throw new McpError(
        ErrorCode.InvalidParams,
        dartyMcpCopy.unknownTool(name),
      );
    }

    return handleToolCall(registration, (args ?? {}) as Record<string, unknown>);
  });

  return server;
};

export const startDartyMcpServer = async (): Promise<Server> => {
  const server = createDartyMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  return server;
};
