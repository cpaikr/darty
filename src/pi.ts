import {
  createDartyToolset,
  dartyOperationNames,
  DartyToolsetError,
  type DartyToolset,
} from "./toolset.ts";

export type PiToolContent = {
  readonly type: "text";
  readonly text: string;
};

export type PiToolResult = {
  readonly content: readonly PiToolContent[];
  readonly details: unknown;
};

export type DartyPiToolDefinition = {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly promptSnippet: string;
  readonly promptGuidelines: readonly string[];
  readonly parameters: unknown;
  readonly execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<PiToolResult>;
};

export type DartyPiExtensionAPI = {
  readonly registerTool: (tool: DartyPiToolDefinition) => void;
};

type SerializedError = {
  readonly name: string;
  readonly code?: string;
  readonly message: string;
  readonly retryable?: boolean;
  readonly parameter?: string;
  readonly operationName?: string;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;
};

const stringSchema = (description: string, extra: Record<string, unknown> = {}) => ({
  type: "string",
  description,
  ...extra,
});

const objectSchema = (
  properties: Record<string, unknown>,
  required: readonly string[],
  description?: string,
) => ({
  type: "object",
  ...(description === undefined ? {} : { description }),
  additionalProperties: false,
  properties,
  required: [...required],
});

export const dartyListOperationsParameters = objectSchema({}, []);

export const dartyGetOperationDetailsParameters = objectSchema(
  {
    name: stringSchema("Canonical Darty operation name to inspect.", {
      enum: [...dartyOperationNames],
    }),
  },
  ["name"],
);

export const dartyRunOperationParameters = objectSchema(
  {
    name: stringSchema("Canonical Darty operation name to execute.", {
      enum: [...dartyOperationNames],
    }),
    input: {
      type: "object",
      description:
        "Operation input object matching the selected operation's inputJsonSchema from darty_get_operation_details.",
      additionalProperties: true,
    },
  },
  ["name", "input"],
);

export const dartyGetHelpParameters = objectSchema({}, []);

const toTextResult = (text: string, details: unknown): PiToolResult => ({
  content: [{ type: "text", text }],
  details,
});

const copyKnownErrorFields = (
  record: Record<string, unknown>,
): Omit<SerializedError, "name" | "message"> => ({
  ...(typeof record.code === "string" ? { code: record.code } : {}),
  ...(typeof record.retryable === "boolean" ? { retryable: record.retryable } : {}),
  ...(typeof record.parameter === "string" ? { parameter: record.parameter } : {}),
  ...(typeof record.operationName === "string"
    ? { operationName: record.operationName }
    : {}),
  ...(typeof record.sourceUrl === "string" ? { sourceUrl: record.sourceUrl } : {}),
  ...(typeof record.recoveryHint === "string"
    ? { recoveryHint: record.recoveryHint }
    : {}),
});

const serializeError = (error: unknown): SerializedError => {
  if (error instanceof DartyToolsetError) {
    return {
      name: error.name,
      message: error.message,
      ...copyKnownErrorFields(error as unknown as Record<string, unknown>),
    };
  }

  if (error instanceof Error) {
    const record = error as Error & Record<string, unknown>;

    return {
      name: error.name,
      message: error.message,
      ...copyKnownErrorFields(record),
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatWarningSummary = (warnings: unknown): string => {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    return "No warnings.";
  }

  const codes = warnings
    .map((warning) => (isRecord(warning) ? warning.code : undefined))
    .filter((code): code is string => typeof code === "string");

  return codes.length > 0
    ? `Warnings (${warnings.length}): ${codes.join(", ")}.`
    : `Warnings: ${warnings.length}.`;
};

const countArrayField = (value: unknown, field: string): number | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldValue = value[field];
  return Array.isArray(fieldValue) ? fieldValue.length : undefined;
};

const summarizeResultPayload = (operationName: string, result: unknown): string => {
  if (!isRecord(result)) {
    return `Darty ${operationName} completed.`;
  }

  const resultObject = isRecord(result.result) ? result.result : undefined;
  const itemCount = countArrayField(resultObject, "items");
  const documentCount = countArrayField(resultObject, "documents");
  const tocCount = countArrayField(resultObject, "toc");
  const warningSummary = formatWarningSummary(result.warnings);
  const counts = [
    itemCount === undefined ? undefined : `${itemCount} item(s)`,
    documentCount === undefined ? undefined : `${documentCount} document(s)`,
    tocCount === undefined ? undefined : `${tocCount} toc item(s)`,
  ].filter((value): value is string => value !== undefined);

  return counts.length > 0
    ? `Darty ${operationName} completed: ${counts.join(", ")}. ${warningSummary}`
    : `Darty ${operationName} completed. ${warningSummary}`;
};

const createListOperationsTool = (toolset: DartyToolset): DartyPiToolDefinition => ({
  name: "darty_list_operations",
  label: "Darty List Operations",
  description: "List canonical Darty operations available through the progressive Darty adapter.",
  promptSnippet:
    "Use darty_list_operations to discover available Darty disclosure-search operations before choosing one.",
  promptGuidelines: [
    "Use darty_list_operations when you need to discover what Darty can do.",
    "Use canonical operation names from this tool with darty_get_operation_details and darty_run_operation.",
  ],
  parameters: dartyListOperationsParameters,
  async execute() {
    const operations = toolset.listOperations();
    const lines = operations.map(
      (operation) => `- ${operation.name}: ${operation.description}`,
    );

    return toTextResult(`Darty operations:\n${lines.join("\n")}`, {
      toolset: toolset.id,
      operations,
    });
  },
});

const createGetOperationDetailsTool = (
  toolset: DartyToolset,
): DartyPiToolDefinition => ({
  name: "darty_get_operation_details",
  label: "Darty Get Operation Details",
  description:
    "Return a Darty operation's description and JSON-schema input/result contracts.",
  promptSnippet:
    "Use darty_get_operation_details with a canonical Darty operation name before darty_run_operation when you need the input schema.",
  promptGuidelines: [
    "Call darty_get_operation_details before darty_run_operation when you are unsure about required fields or allowed values.",
    "Pass the exact name field returned by darty_list_operations.",
  ],
  parameters: dartyGetOperationDetailsParameters,
  async execute(_toolCallId, params) {
    const name = params.name;

    if (typeof name !== "string") {
      return toTextResult("Darty operation name must be a string.", {
        ok: false,
        error: {
          name: "DartyPiAdapterError",
          code: "invalid_parameter",
          message: "Darty operation name must be a string.",
          parameter: "name",
        },
      });
    }

    const operation = toolset.getOperation(name);

    if (operation === undefined) {
      const error = serializeError(
        new DartyToolsetError({
          code: "unknown_operation",
          message: `Unknown Darty operation: ${name}`,
          retryable: false,
          operationName: name,
        }),
      );

      return toTextResult(`Unknown Darty operation: ${name}`, {
        ok: false,
        error,
      });
    }

    return toTextResult(
      `Darty operation ${operation.name}: ${operation.description}\nInput schema and result schema are available in details.`,
      {
        ok: true,
        operation,
      },
    );
  },
});

const createRunOperationTool = (toolset: DartyToolset): DartyPiToolDefinition => ({
  name: "darty_run_operation",
  label: "Darty Run Operation",
  description:
    "Execute one canonical Darty operation and return concise text plus the full structured result in details.",
  promptSnippet:
    "Use darty_run_operation to execute a Darty operation after choosing the canonical operation name and forming valid input.",
  promptGuidelines: [
    "Use darty_run_operation only with canonical operation names from darty_list_operations.",
    "Inspect schemas with darty_get_operation_details when required fields or allowed values are unclear.",
    "Read full DART references, warnings, metadata, and typed errors from details; normal text is intentionally concise.",
  ],
  parameters: dartyRunOperationParameters,
  async execute(_toolCallId, params, signal) {
    const name = params.name;
    const input = params.input;

    if (typeof name !== "string" || !isRecord(input)) {
      return toTextResult("Darty run requires string name and object input.", {
        ok: false,
        error: {
          name: "DartyPiAdapterError",
          code: "invalid_parameter",
          message: "Darty run requires string name and object input.",
        },
      });
    }

    try {
      const result = await toolset.execute(
        name,
        input,
        signal === undefined ? undefined : { signal },
      );

      return toTextResult(summarizeResultPayload(name, result), {
        ok: true,
        operationName: name,
        result,
      });
    } catch (error) {
      const serialized = serializeError(error);

      return toTextResult(`Darty ${name} failed: ${serialized.message}`, {
        ok: false,
        operationName: name,
        error: serialized,
      });
    }
  },
});

const createGetHelpTool = (toolset: DartyToolset): DartyPiToolDefinition => ({
  name: "darty_get_help",
  label: "Darty Help",
  description: "Explain the progressive Darty Pi tools and how to use them.",
  promptSnippet:
    "Use darty_get_help when you need guidance on the progressive Darty Pi tools.",
  promptGuidelines: [
    "Use darty_get_help for adapter usage help, not for running DART searches.",
  ],
  parameters: dartyGetHelpParameters,
  async execute() {
    return toTextResult(
      [
        "Darty exposes DART capabilities progressively:",
        "1. darty_list_operations — discover canonical operations.",
        "2. darty_get_operation_details — inspect a chosen operation's schemas.",
        "3. darty_run_operation — execute the operation with schema-valid input.",
        "Normal text is concise; full result envelopes, references, warnings, metadata, and typed errors are in details.",
      ].join("\n"),
      {
        toolset: toolset.id,
        operations: toolset.listOperations(),
      },
    );
  },
});

export type CreateDartyPiToolsOptions = {
  readonly toolset?: DartyToolset;
  readonly includeHelpTool?: boolean;
};

export const createDartyPiTools = (
  options: CreateDartyPiToolsOptions = {},
): readonly DartyPiToolDefinition[] => {
  const toolset = options.toolset ?? createDartyToolset();
  const tools = [
    createListOperationsTool(toolset),
    createGetOperationDetailsTool(toolset),
    createRunOperationTool(toolset),
  ];

  return options.includeHelpTool === false
    ? tools
    : [...tools, createGetHelpTool(toolset)];
};

export const registerDartyPiTools = (
  pi: DartyPiExtensionAPI,
  options: CreateDartyPiToolsOptions = {},
): void => {
  for (const tool of createDartyPiTools(options)) {
    pi.registerTool(tool);
  }
};

export default function dartyPiExtension(pi: DartyPiExtensionAPI): void {
  registerDartyPiTools(pi);
}
