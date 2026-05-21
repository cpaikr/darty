import {
  createDartyToolset,
  DartyToolsetError,
  dartyOperationNames,
  serializeDartyError,
  type DartyCommandHelp,
  type DartySerializedError,
  type DartyToolset,
  type DartyToolsetHelp,
  type DartyValidationFailure,
  type DartyValidationResult,
} from "./toolset.ts";

export type DartyPiToolAction = "help" | "command_help" | "validate" | "run";

export type DartyPiToolInput = {
  action: DartyPiToolAction;
  command?: string;
  inputJson?: Record<string, unknown>;
};

export type PiToolContent = {
  type: "text";
  text: string;
};

export type PiToolResult = {
  content: PiToolContent[];
  details: unknown;
};

export type DartyPiToolDefinition = {
  name: "darty";
  label: string;
  description: string;
  promptSnippet: string;
  promptGuidelines: string[];
  parameters: typeof dartyPiToolParameters;
  execute: (
    toolCallId: string,
    params: DartyPiToolInput,
    signal?: AbortSignal,
    onUpdate?: unknown,
    ctx?: unknown,
  ) => Promise<PiToolResult>;
};

export type DartyPiExtensionAPI = {
  registerTool: (tool: DartyPiToolDefinition) => void;
};

type DartyPiToolset = Pick<
  DartyToolset,
  | "id"
  | "label"
  | "description"
  | "help"
  | "listOperations"
  | "getCommandHelp"
  | "validateInput"
  | "execute"
> & {
  serializeError?: typeof serializeDartyError;
};

type DartyPiActionResult =
  | {
      ok: true;
      action: "help";
      help: DartyToolsetHelp;
    }
  | {
      ok: true;
      action: "command_help";
      command: string;
      commandHelp: DartyCommandHelp;
    }
  | {
      ok: true;
      action: "validate";
      command: string;
      validation: Extract<DartyValidationResult, { ok: true }>;
    }
  | {
      ok: true;
      action: "run";
      command: string;
      normalizedInput: Record<string, unknown>;
      result: unknown;
    }
  | {
      ok: false;
      action: DartyPiToolAction | "adapter_validation";
      command?: string;
      error: DartyValidationFailure | DartySerializedError;
    };

const dartyPiActions = ["help", "command_help", "validate", "run"] as const;

const actionSchema = {
  type: "string",
  enum: [...dartyPiActions],
  description:
    "Darty tool action: help, command_help, validate, or run.",
};

const commandSchema = {
  type: "string",
  enum: [...dartyOperationNames],
  description: "Canonical Darty operation name, such as search-company or view-report.",
};

export const dartyPiToolParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: actionSchema,
    command: commandSchema,
    inputJson: {
      type: "object",
      additionalProperties: true,
      description:
        "Command input object using the selected Darty operation's JSON input contract.",
    },
  },
  required: ["action"],
};

export type CreateDartyPiToolOptions = {
  toolset?: DartyPiToolset;
};

const toTextResult = (text: string, details: DartyPiActionResult): PiToolResult => ({
  content: [{ type: "text", text }],
  details,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDartyPiAction = (value: unknown): value is DartyPiToolAction =>
  typeof value === "string" && dartyPiActions.includes(value as DartyPiToolAction);

const json = (value: unknown): string => JSON.stringify(value, null, 2);

const bulletList = (items: readonly string[]): string =>
  items.length === 0 ? "- None." : items.map((item) => `- ${item}`).join("\n");

const createAdapterValidationFailure = (input: {
  code: DartyValidationFailure["code"];
  message: string;
  parameter: string;
  reason: string;
  expected?: string;
  actual?: unknown;
  command?: string;
  recoveryHint?: string;
}): DartyValidationFailure => ({
  code: input.code,
  message: input.message,
  ...(input.command === undefined ? {} : { operationName: input.command }),
  parameter: input.parameter,
  reason: input.reason,
  ...(input.expected === undefined ? {} : { expected: input.expected }),
  ...("actual" in input ? { actual: input.actual } : {}),
  ...(input.recoveryHint === undefined ? {} : { recoveryHint: input.recoveryHint }),
});

const adapterFailureResult = (
  action: DartyPiToolAction | "adapter_validation",
  error: DartyValidationFailure,
  command?: string,
): PiToolResult =>
  toTextResult(`Darty tool input is invalid.\n${json(error)}`, {
    ok: false,
    action,
    ...(command === undefined ? {} : { command }),
    error,
  });

const requireCommand = (
  action: DartyPiToolAction,
  command: unknown,
): string | PiToolResult => {
  if (typeof command === "string" && command.length > 0) {
    return command;
  }

  return adapterFailureResult(
    action,
    createAdapterValidationFailure({
      code: command === undefined ? "missing_parameter" : "invalid_parameter",
      message: `Darty action ${action} requires command to be a canonical operation name.`,
      parameter: "command",
      reason: command === undefined ? "required" : "invalid_type",
      expected: dartyOperationNames.join(","),
      actual: command,
      recoveryHint: "Call darty with action=help to see canonical command names.",
    }),
  );
};

const requireInputJson = (
  action: "validate" | "run",
  command: string,
  inputJson: unknown,
): Record<string, unknown> | PiToolResult => {
  if (isRecord(inputJson)) {
    return inputJson;
  }

  return adapterFailureResult(
    action,
    createAdapterValidationFailure({
      code: inputJson === undefined ? "missing_parameter" : "invalid_parameter",
      message: `Darty action ${action} requires inputJson to be an object.`,
      parameter: "inputJson",
      reason: inputJson === undefined ? "required" : "invalid_type",
      expected: "object",
      actual: inputJson,
      command,
      recoveryHint: "Call darty with action=command_help for the command's input schema and examples.",
    }),
    command,
  );
};

const contentForHelp = (help: DartyToolsetHelp): string => {
  const operations = help.operations.map(
    (operation) => `- ${operation.name}: ${operation.description}`,
  );

  return [
    `${help.label}: ${help.description}`,
    "",
    "Use as: darty(action, command?, inputJson?)",
    "Actions:",
    "- help: source-level help and command menu.",
    "- command_help: one command's schema, examples, limitations, and result summary.",
    "- validate: validate and normalize one command input without live DART access.",
    "- run: validate, then execute one command.",
    "",
    "Commands:",
    ...operations,
    "",
    "Limitations:",
    bulletList(help.limitations),
    "",
    "Citation guidance:",
    bulletList(help.citationGuidance),
  ].join("\n");
};

const contentForCommandHelp = (commandHelp: DartyCommandHelp): string =>
  [
    `Darty command ${commandHelp.name}: ${commandHelp.description}`,
    `Required input keys: ${commandHelp.requiredInputKeys.join(", ") || "none"}`,
    "",
    "Input JSON Schema:",
    json(commandHelp.inputJsonSchema),
    "",
    "Examples:",
    json(commandHelp.examples),
    "",
    "Limitations:",
    bulletList(commandHelp.limitations),
    "",
    "Result summary:",
    commandHelp.resultSummary,
  ].join("\n");

const contentForValidationSuccess = (
  command: string,
  validation: Extract<DartyValidationResult, { ok: true }>,
): string =>
  [
    `Darty validation succeeded for ${command}.`,
    "Normalized input:",
    json(validation.input),
  ].join("\n");

const contentForValidationFailure = (
  action: "validate" | "run",
  command: string,
  error: DartyValidationFailure,
): string =>
  [
    `Darty ${action} input validation failed for ${command}.`,
    "Repair feedback:",
    json(error),
  ].join("\n");

const contentForRunSuccess = (command: string, result: unknown): string =>
  [
    `Darty run succeeded for ${command}.`,
    "Use the returned references, warnings, metadata, and source URLs for citations and follow-up commands.",
    "Result envelope:",
    json(result),
  ].join("\n");

const contentForRunFailure = (command: string, error: DartySerializedError): string =>
  [
    `Darty run failed for ${command}.`,
    "Error:",
    json(error),
  ].join("\n");

const unknownCommandResult = (
  action: "command_help",
  command: string,
): PiToolResult => {
  const error = serializeDartyError(
    new DartyToolsetError({
      code: "unknown_operation",
      message: `Unknown Darty operation: ${command}`,
      retryable: false,
      operationName: command,
    }),
  );

  return toTextResult(`Unknown Darty command: ${command}\n${json(error)}`, {
    ok: false,
    action,
    command,
    error,
  });
};

const handleHelp = (toolset: DartyPiToolset): PiToolResult => {
  const help = toolset.help();

  return toTextResult(contentForHelp(help), {
    ok: true,
    action: "help",
    help,
  });
};

const handleCommandHelp = (
  toolset: DartyPiToolset,
  command: string,
): PiToolResult => {
  const commandHelp = toolset.getCommandHelp(command);

  if (commandHelp === undefined) {
    return unknownCommandResult("command_help", command);
  }

  return toTextResult(contentForCommandHelp(commandHelp), {
    ok: true,
    action: "command_help",
    command,
    commandHelp,
  });
};

const handleValidate = (
  toolset: DartyPiToolset,
  command: string,
  inputJson: Record<string, unknown>,
): PiToolResult => {
  const validation = toolset.validateInput(command, inputJson);

  if (!validation.ok) {
    return toTextResult(contentForValidationFailure("validate", command, validation.error), {
      ok: false,
      action: "validate",
      command,
      error: validation.error,
    });
  }

  return toTextResult(contentForValidationSuccess(command, validation), {
    ok: true,
    action: "validate",
    command,
    validation,
  });
};

const handleRun = async (
  toolset: DartyPiToolset,
  command: string,
  inputJson: Record<string, unknown>,
  signal: AbortSignal | undefined,
): Promise<PiToolResult> => {
  const validation = toolset.validateInput(command, inputJson);

  if (!validation.ok) {
    return toTextResult(contentForValidationFailure("run", command, validation.error), {
      ok: false,
      action: "run",
      command,
      error: validation.error,
    });
  }

  try {
    const result = await toolset.execute(
      command,
      validation.input,
      signal === undefined ? undefined : { signal },
    );

    return toTextResult(contentForRunSuccess(command, result), {
      ok: true,
      action: "run",
      command,
      normalizedInput: validation.input,
      result,
    });
  } catch (error) {
    const serialized = toolset.serializeError?.(error) ?? serializeDartyError(error);

    return toTextResult(contentForRunFailure(command, serialized), {
      ok: false,
      action: "run",
      command,
      error: serialized,
    });
  }
};

export const createDartyPiTool = (
  options: CreateDartyPiToolOptions = {},
): DartyPiToolDefinition => {
  const toolset = options.toolset ?? createDartyToolset();

  return {
    name: "darty",
    label: "Darty",
    description:
      "One read-only DART disclosure source tool. Use help or command_help to inspect commands, validate to normalize input, and run to execute with references, warnings, and metadata.",
    promptSnippet:
      "Use darty(action, command?, inputJson?) for Korean DART disclosure search, company lookup, filing lists, disclosure type lookup, RSS, and report viewing.",
    promptGuidelines: [
      "Use darty with action=help to discover available DART commands before guessing command names.",
      "Use darty with action=command_help when required keys, allowed values, examples, or result shape are unclear.",
      "Use darty with action=validate to repair or normalize command input without live DART access.",
      "Use darty with action=run only after forming command input; Darty validates before execution and returns references, warnings, metadata, and source URLs for citations.",
    ],
    parameters: dartyPiToolParameters,
    async execute(_toolCallId, params, signal) {
      if (!isRecord(params) || !isDartyPiAction(params.action)) {
        return adapterFailureResult(
          "adapter_validation",
          createAdapterValidationFailure({
            code: "invalid_parameter",
            message: "Darty action must be one of help, command_help, validate, or run.",
            parameter: "action",
            reason: !isRecord(params) ? "invalid_type" : "invalid_enum",
            expected: dartyPiActions.join(","),
            actual: isRecord(params) ? params.action : params,
            recoveryHint: "Call darty with action=help for the command menu.",
          }),
        );
      }

      switch (params.action) {
        case "help":
          return handleHelp(toolset);
        case "command_help": {
          const command = requireCommand(params.action, params.command);
          return typeof command === "string"
            ? handleCommandHelp(toolset, command)
            : command;
        }
        case "validate": {
          const command = requireCommand(params.action, params.command);
          if (typeof command !== "string") {
            return command;
          }

          const inputJson = requireInputJson(params.action, command, params.inputJson);
          return isRecord(inputJson)
            ? handleValidate(toolset, command, inputJson)
            : inputJson;
        }
        case "run": {
          const command = requireCommand(params.action, params.command);
          if (typeof command !== "string") {
            return command;
          }

          const inputJson = requireInputJson(params.action, command, params.inputJson);
          return isRecord(inputJson)
            ? handleRun(toolset, command, inputJson, signal)
            : inputJson;
        }
      }
    },
  };
};

export const registerDartyPiTool = (
  pi: DartyPiExtensionAPI,
  options: CreateDartyPiToolOptions = {},
): void => {
  pi.registerTool(createDartyPiTool(options));
};

export default function dartyPiExtension(pi: DartyPiExtensionAPI): void {
  registerDartyPiTool(pi);
}
