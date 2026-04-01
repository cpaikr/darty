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
import { ContentsSearchFailure } from "../capabilities/contents-search/contract.ts";

const serverInfo = {
  name: "darty",
  version: "0.1.0",
} as const;

const contentsSearchToolTitle = "DART Contents Search";
const contentsSearchToolDescription =
  "Semantic, read-only access to DART filing contents search backed by an internal dsab007 replay adapter.";

type DartyMcpOperations = {
  readonly contentsSearch: ContentsSearchOperation;
};

type DartyMcpServerOptions = {
  readonly operations?: Partial<DartyMcpOperations>;
};

const defaultOperations: DartyMcpOperations = {
  contentsSearch: defaultContentsSearchOperation,
};

type JsonObjectToolSchema = Tool["inputSchema"];

const toObjectToolSchema = (
  schemaValue: ContentsSearchOperation["inputJsonSchema"],
): JsonObjectToolSchema => {
  const schema = schemaValue as Partial<JsonObjectToolSchema> &
    Record<string, unknown>;

  if (schema.type !== "object") {
    throw new Error("Contents-search MCP tool schemas must have an object root.");
  }

  return schema as JsonObjectToolSchema;
};

const serializeToolPayload = (value: unknown): string =>
  JSON.stringify(value, null, 2);

const toContentsSearchFailureResult = (
  error: ContentsSearchFailure,
): CallToolResult => ({
  content: [{ type: "text", text: error.message }],
  isError: true,
});

const createContentsSearchToolDefinition = (
  operation: ContentsSearchOperation,
): Tool => ({
  name: operation.name,
  title: contentsSearchToolTitle,
  description: contentsSearchToolDescription,
  inputSchema: toObjectToolSchema(operation.inputJsonSchema),
  outputSchema: toObjectToolSchema(operation.resultJsonSchema),
  annotations: {
    title: contentsSearchToolTitle,
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
});

const handleContentsSearchToolCall = async (
  operation: ContentsSearchOperation,
  args: Record<string, unknown>,
): Promise<CallToolResult> => {
  try {
    const result = await operation.execute(args);

    return {
      content: [{ type: "text", text: serializeToolPayload(result) }],
      structuredContent: result as Record<string, unknown>,
    };
  } catch (error) {
    if (error instanceof ContentsSearchFailure) {
      return toContentsSearchFailureResult(error);
    }

    throw error;
  }
};

export const createDartyMcpServer = (
  options?: DartyMcpServerOptions,
): Server => {
  const operations = {
    ...defaultOperations,
    ...options?.operations,
  } satisfies DartyMcpOperations;
  const server = new Server(serverInfo, {
    capabilities: {
      tools: {},
    },
    instructions:
      "Darty exposes read-only DART search tools with semantic inputs and structured JSON results.",
  });
  const contentsSearchTool = createContentsSearchToolDefinition(
    operations.contentsSearch,
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [contentsSearchTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case operations.contentsSearch.name:
        return handleContentsSearchToolCall(
          operations.contentsSearch,
          (args ?? {}) as Record<string, unknown>,
        );
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unknown tool "${name}".`);
    }
  });

  return server;
};

export const startDartyMcpServer = async (): Promise<Server> => {
  const server = createDartyMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  return server;
};
