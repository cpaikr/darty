import { parseSearchCompanyCommandArgs } from "../../src/cli/commands/search-company.ts";
import { parseSearchCompanyReportsCommandArgs } from "../../src/cli/commands/search-company-reports.ts";
import { parseViewReportCommandArgs } from "../../src/cli/commands/view-report.ts";
import { truncate } from "../harness/tool-trace.ts";
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
      readonly options: Record<string, unknown>;
    };

export type WorkflowCliValidation =
  | { readonly ok: true; readonly parsed: ParsedWorkflowInvocation }
  | { readonly ok: false; readonly reason: string };

const commandTimeoutMs = 45_000;
const terminationGraceMs = 2_000;
const streamGraceMs = 2_000;

export type WorkflowToolExecutionOptions = {
  readonly commandTimeoutMs?: number;
  readonly terminationGraceMs?: number;
  readonly streamGraceMs?: number;
};

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

const asOptions = (value: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value));

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

  try {
    const options =
      commandName === "search-company"
        ? parseSearchCompanyCommandArgs([...commandArgv]).request
        : commandName === "search-company-reports"
          ? parseSearchCompanyReportsCommandArgs([...commandArgv]).request
          : parseViewReportCommandArgs([...commandArgv]).request;

    return {
      ok: true,
      parsed: {
        kind: "operation",
        operation: commandName,
        argv: commandArgv,
        options: asOptions(options),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: `${commandName} arguments were rejected by the CLI parser: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
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

const createDartyCliEnv = (): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const key of [
    "ALL_PROXY",
    "APP_ENV",
    "DARTY_LOG_LEVEL",
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "HOME",
    "LANG",
    "LC_ALL",
    "NODE_ENV",
    "NO_PROXY",
    "PATH",
    "SSL_CERT_FILE",
    "TMPDIR",
    "TMP",
    "TEMP",
  ]) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }

  return env;
};

const collectStreamText = (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const result = (async () => {
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          return text + decoder.decode();
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  })();

  return {
    result,
    cancel: (reason?: unknown) => reader.cancel(reason),
  };
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

  const proc = Bun.spawn({
    cmd: [process.execPath, "run", "src/cli.ts", ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: createDartyCliEnv(),
  });

  const stdoutCollector = collectStreamText(proc.stdout);
  const stderrCollector = collectStreamText(proc.stderr);

  let timeout: Timer | undefined;
  let timedOut = false;
  const completedExitCode = await Promise.race([
    proc.exited,
    new Promise<number>((resolve) => {
      timeout = setTimeout(() => {
        timedOut = true;
        proc.kill();
        resolve(124);
      }, options.commandTimeoutMs ?? commandTimeoutMs);
    }),
  ]);

  if (timeout !== undefined) {
    clearTimeout(timeout);
  }

  if (timedOut) {
    const terminated = await Promise.race([
      proc.exited.then(() => true),
      Bun.sleep(options.terminationGraceMs ?? terminationGraceMs).then(() => false),
    ]);
    if (!terminated) {
      proc.kill("SIGKILL");
      await proc.exited;
    }
  }

  const streamResults = Promise.all([
    stdoutCollector.result,
    stderrCollector.result,
  ] as const);
  let output: readonly [string, string];
  if (timedOut) {
    const boundedOutput = await Promise.race([
      streamResults,
      Bun.sleep(options.streamGraceMs ?? streamGraceMs).then(() => null),
    ]);
    if (boundedOutput === null) {
      void stdoutCollector
        .cancel("timed-out subprocess stdout remained open")
        .catch(() => undefined);
      void stderrCollector
        .cancel("timed-out subprocess stderr remained open")
        .catch(() => undefined);
      output = await streamResults;
    } else {
      output = boundedOutput;
    }
  } else {
    output = await streamResults;
  }
  const [stdout, stderr] = output;

  return {
    toolName: "run_darty_cli",
    input,
    display: formatDartyDisplay(argv),
    exitCode: timedOut ? 124 : completedExitCode,
    stdout: stdout.trim(),
    stderr: truncate(stderr.trim(), 4_000),
  };
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
