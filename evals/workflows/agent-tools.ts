import { runCliProcess, type CliExecutionOptions } from "../harness/cli-process.ts";
import type {
  WorkflowToolCall,
  WorkflowToolExecution,
  WorkflowToolName,
} from "./agent-types.ts";

export type WorkflowOperation =
  | "search-company"
  | "search-company-reports"
  | "view-report";

export type ParsedWorkflowInvocation =
  | { readonly kind: "discovery"; readonly argv: readonly string[] }
  | {
      readonly kind: "operation";
      readonly operation: WorkflowOperation;
      readonly argv: readonly string[];
    };

export type WorkflowCliValidation =
  | { readonly ok: true; readonly parsed: ParsedWorkflowInvocation }
  | { readonly ok: false; readonly reason: string };

export type WorkflowToolExecutionOptions = CliExecutionOptions;

export const workflowAgentTools = [
  {
    type: "function",
    function: {
      name: "run_darty_cli",
      description:
        "Run the local darty CLI with a structured argv array. Use this for live DART search and report retrieval; empty or help invocations print CLI help.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          argv: {
            type: "array",
            items: { type: "string" },
            maxItems: 32,
            description: "Arguments passed after the darty command name.",
          },
        },
        required: ["argv"],
      },
    },
  },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const includesHelpFlag = (argv: readonly string[]): boolean =>
  argv.some((argument) => argument === "--help" || argument === "-h");

const formatArg = (argument: string): string =>
  /^[A-Za-z0-9._:/=-]+$/u.test(argument) ? argument : JSON.stringify(argument);

const formatDartyDisplay = (argv: readonly string[]): string =>
  ["darty", ...argv].map(formatArg).join(" ");

const validateDartyArgvShape = (argv: readonly string[]): string | undefined => {
  if (argv.length > 32) {
    return "darty argv contains too many arguments";
  }

  const totalLength = argv.reduce((sum, argument) => sum + argument.length, 0);
  if (totalLength > 2_000) {
    return "darty argv is too long";
  }

  const invalidArgument = argv.find((argument) => /[\0\n\r]/u.test(argument));
  if (invalidArgument !== undefined) {
    return `darty argv contains an invalid argument: ${JSON.stringify(invalidArgument)}`;
  }

  return undefined;
};

export const validateWorkflowCliArgv = (
  argv: readonly string[],
): WorkflowCliValidation => {
  const shapeError = validateDartyArgvShape(argv);
  if (shapeError !== undefined) {
    return { ok: false, reason: shapeError };
  }

  if (argv.length === 0 || (argv.length === 1 && includesHelpFlag(argv))) {
    return { ok: true, parsed: { kind: "discovery", argv } };
  }

  if (argv[0] === "help" && (argv.length === 1 || (argv.length === 2 && ["search-company", "search-company-reports", "view-report"].includes(argv[1]!)))) {
    return { ok: true, parsed: { kind: "discovery", argv } };
  }

  const commandName = argv[0];
  if (
    commandName !== "search-company" &&
    commandName !== "search-company-reports" &&
    commandName !== "view-report"
  ) {
    return {
      ok: false,
      reason:
        "run_darty_cli only allows general help, search-company, search-company-reports, or view-report",
    };
  }

  const commandArgv = argv.slice(1);
  if (includesHelpFlag(commandArgv)) {
    return { ok: true, parsed: { kind: "discovery", argv } };
  }

  return { ok: true, parsed: { kind: "operation", operation: commandName, argv: commandArgv } };
};

const parseToolArguments = (toolCall: WorkflowToolCall): unknown =>
  JSON.parse(toolCall.function.arguments);

const rejectToolCall = (
  toolName: WorkflowToolName,
  input: unknown,
  reason: string,
): WorkflowToolExecution => ({
  toolName,
  input,
  display: toolName,
  exitCode: 126,
  stdout: "",
  stderr: reason,
  rejected: reason,
});

const getStringArrayProperty = (
  value: Record<string, unknown>,
  key: string,
): readonly string[] | undefined => {
  const child = value[key];
  return Array.isArray(child) && child.every((item) => typeof item === "string")
    ? child
    : undefined;
};

const runDartyCli = async (
  repoRoot: string,
  input: unknown,
  options: WorkflowToolExecutionOptions,
): Promise<WorkflowToolExecution> => {
  if (!isRecord(input)) {
    return rejectToolCall("run_darty_cli", input, "arguments must be an object");
  }

  const argv = getStringArrayProperty(input, "argv");
  if (argv === undefined) {
    return rejectToolCall("run_darty_cli", input, "argv must be an array of strings");
  }

  const validation = validateWorkflowCliArgv(argv);
  if (!validation.ok) {
    return {
      toolName: "run_darty_cli",
      input,
      display: formatDartyDisplay(argv),
      exitCode: 126,
      stdout: "",
      stderr: validation.reason,
      rejected: validation.reason,
    };
  }

  return { toolName: "run_darty_cli", input, display: formatDartyDisplay(argv),
    ...await runCliProcess(repoRoot, argv, options) };

};

export const executeWorkflowToolCall = async (
  repoRoot: string,
  toolCall: WorkflowToolCall,
  options: WorkflowToolExecutionOptions = {},
): Promise<WorkflowToolExecution> => {
  let input: unknown;
  try {
    input = parseToolArguments(toolCall);
  } catch (error) {
    return rejectToolCall(
      toolCall.function.name,
      toolCall.function.arguments,
      error instanceof Error ? error.message : String(error),
    );
  }

  return runDartyCli(repoRoot, input, options);
};
