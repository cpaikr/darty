import {
  createDartySingleToolActionFailure,
  createDartySingleToolCommandFailure,
  createDartySingleToolInputJsonFailure,
  createDartyToolset,
  createDartyUnknownOperationError,
  dartyOperationNames,
  dartySingleToolActions,
  dartySingleToolCopy,
  formatDartyCommandHelp,
  formatDartyInvalidToolInput,
  formatDartyRunFailure,
  formatDartyRunSuccess,
  formatDartyToolsetHelp,
  formatDartyUnknownCommand,
  formatDartyValidationFailure,
  formatDartyValidationSuccess,
  serializeDartyError,
  type DartyCommandHelp,
  type DartySerializedError,
  type DartySingleToolAction,
  type DartySingleToolRunAction,
  type DartyToolset,
  type DartyToolsetHelp,
  type DartyValidationFailure,
  type DartyValidationResult,
} from "./toolset.ts";

export type DartyPiToolAction = DartySingleToolAction;

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

const actionSchema = {
  type: "string",
  enum: [...dartySingleToolActions],
  description: dartySingleToolCopy.parameterDescriptions.action,
};

const commandSchema = {
  type: "string",
  enum: [...dartyOperationNames],
  description: dartySingleToolCopy.parameterDescriptions.command,
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
      description: dartySingleToolCopy.parameterDescriptions.inputJson,
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
  typeof value === "string" &&
  dartySingleToolActions.includes(value as DartyPiToolAction);

const adapterFailureResult = (
  action: DartyPiToolAction | "adapter_validation",
  error: DartyValidationFailure,
  command?: string,
): PiToolResult =>
  toTextResult(formatDartyInvalidToolInput(error), {
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
    createDartySingleToolCommandFailure(action, command),
  );
};

const requireInputJson = (
  action: DartySingleToolRunAction,
  command: string,
  inputJson: unknown,
): Record<string, unknown> | PiToolResult => {
  if (isRecord(inputJson)) {
    return inputJson;
  }

  return adapterFailureResult(
    action,
    createDartySingleToolInputJsonFailure(action, command, inputJson),
    command,
  );
};

const unknownCommandResult = (
  action: "command_help",
  command: string,
): PiToolResult => {
  const error = serializeDartyError(createDartyUnknownOperationError(command));

  return toTextResult(formatDartyUnknownCommand(command, error), {
    ok: false,
    action,
    command,
    error,
  });
};

const handleHelp = (toolset: DartyPiToolset): PiToolResult => {
  const help = toolset.help();

  return toTextResult(formatDartyToolsetHelp(help), {
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

  return toTextResult(formatDartyCommandHelp(commandHelp), {
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
    return toTextResult(formatDartyValidationFailure("validate", command, validation.error), {
      ok: false,
      action: "validate",
      command,
      error: validation.error,
    });
  }

  return toTextResult(formatDartyValidationSuccess(command, validation), {
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
    return toTextResult(formatDartyValidationFailure("run", command, validation.error), {
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

    return toTextResult(formatDartyRunSuccess(command, result), {
      ok: true,
      action: "run",
      command,
      normalizedInput: validation.input,
      result,
    });
  } catch (error) {
    const serialized = toolset.serializeError?.(error) ?? serializeDartyError(error);

    return toTextResult(formatDartyRunFailure(command, serialized), {
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
    label: toolset.label,
    description: dartySingleToolCopy.description,
    promptSnippet: dartySingleToolCopy.promptSnippet,
    promptGuidelines: [...dartySingleToolCopy.promptGuidelines],
    parameters: dartyPiToolParameters,
    async execute(_toolCallId, params, signal) {
      if (!isRecord(params) || !isDartyPiAction(params.action)) {
        return adapterFailureResult(
          "adapter_validation",
          createDartySingleToolActionFailure(params),
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
