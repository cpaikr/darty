import { Command } from "commander";

import { defaultCompanyDetailOperation } from "../app/company-detail.ts";
import { defaultCompanyRssOperation } from "../app/company-rss.ts";
import { defaultDisclosureTypesOperation } from "../app/disclosure-types.ts";
import { defaultReportGuideOperation } from "../app/report-guide.ts";
import { defaultSearchBodyOperation } from "../app/search-body.ts";
import { defaultSearchCompanyOperation } from "../app/search-company.ts";
import { defaultSearchCompanyReportsOperation } from "../app/search-company-reports.ts";
import { defaultViewReportOperation } from "../app/view-report.ts";
import { getErrorDiagnostics } from "../error-diagnostics.ts";
import {
  createCompanyDetailCommandWithRunner,
  executeCompanyDetailCommand,
  renderCompanyDetailCliErrorMessage,
} from "./commands/company-detail.ts";
import {
  createCompanyRssCommandWithRunner,
  executeCompanyRssCommand,
  renderCompanyRssCliErrorMessage,
} from "./commands/company-rss.ts";
import {
  createDisclosureTypesCommandWithRunner,
  executeDisclosureTypesCommand,
  renderDisclosureTypesCliErrorMessage,
} from "./commands/disclosure-types.ts";
import {
  createReportGuideCommandWithRunner,
  executeReportGuideCommand,
} from "./commands/report-guide.ts";
import {
  createSearchBodyCommandWithRunner,
  executeSearchBodyCommand,
  renderSearchBodyCliErrorMessage,
} from "./commands/search-body.ts";
import {
  createSearchCompanyCommandWithRunner,
  executeSearchCompanyCommand,
  renderSearchCompanyCliErrorMessage,
} from "./commands/search-company.ts";
import {
  createSearchCompanyReportsCommandWithRunner,
  executeSearchCompanyReportsCommand,
  renderSearchCompanyReportsCliErrorMessage,
} from "./commands/search-company-reports.ts";
import {
  createViewReportCommandWithRunner,
  executeViewReportCommand,
  renderViewReportCliErrorMessage,
} from "./commands/view-report.ts";
import { configureCliTransport, renderCliFailureJson } from "./command-helpers.ts";

const writeStdout = (text: string) => {
  console.log(text);
};

const writeStderr = (text: string) => {
  console.error(text);
};

const shouldPrettyPrintJson = (argv: readonly string[]): boolean =>
  argv.includes("--pretty");

const stripDebugFlag = (argv: readonly string[]): readonly string[] =>
  argv.filter((arg, index) => index < 2 || arg !== "--debug");

const isRootHelpCommandName = (name: string): boolean => name === "help";

const isRegisteredCliCommandName = (program: Command, name: string): boolean =>
  isRootHelpCommandName(name) ||
  program.commands.some((command) => command.name() === name);

const getCliCommandName = (
  argv: readonly string[],
  program: Command,
): string | undefined => {
  const candidate = argv[2];

  if (
    candidate === undefined ||
    candidate.startsWith("-") ||
    isRootHelpCommandName(candidate)
  ) {
    return undefined;
  }

  return isRegisteredCliCommandName(program, candidate) ? candidate : undefined;
};

const getUnknownCliCommandName = (
  argv: readonly string[],
  program: Command,
): string | undefined => {
  const commandCandidate = argv[2];

  if (commandCandidate === undefined || commandCandidate.startsWith("-")) {
    return undefined;
  }

  const candidate = isRootHelpCommandName(commandCandidate)
    ? argv[3]
    : commandCandidate;

  if (candidate === undefined || candidate.startsWith("-")) {
    return undefined;
  }

  return isRegisteredCliCommandName(program, candidate) ? undefined : candidate;
};

const createUnknownCommandError = (commandName: string) => ({
  code: "commander.unknownCommand",
  message: `error: unknown command '${commandName}'`,
});

const defaultCompanyDetailExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultCompanyDetailOperation.execute(input),
  writeStdout,
};

const defaultCompanyRssExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultCompanyRssOperation.execute(input),
  writeStdout,
};

const defaultDisclosureTypesExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultDisclosureTypesOperation.execute(input),
  writeStdout,
};

const defaultReportGuideExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultReportGuideOperation.execute(input),
  writeStdout,
};

const defaultSearchBodyExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchBodyOperation.execute(input),
  writeStdout,
};

const defaultSearchCompanyExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchCompanyOperation.execute(input),
  writeStdout,
};

const defaultSearchCompanyReportsExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchCompanyReportsOperation.execute(input),
  writeStdout,
};

const defaultViewReportExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultViewReportOperation.execute(input),
  writeStdout,
};

const rootHelpNotes = `
Common agent flow:
  1. Find a company code: darty search-company --company-name 삼성전자
  2. Search filings: darty search-company-reports --company-code 00126380 --start-date YYYYMMDD --end-date YYYYMMDD
  3. Inspect a filing: darty view-report --receipt <filing.receiptNumber-or-viewerUrl>
  4. Read a section: darty view-report --receipt <receipt> --section-id <toc[].id>
  Use search-body for document-level keyword search and disclosure-types for --disclosure-type codes.

Output:
  - Commands print a JSON response object to stdout on success and failure; failures exit non-zero.
  - Use --pretty for indented JSON.
  - Help and report-guide print human-readable text.

Cautions:
  - This tool replays read-only DART web requests observed during browser interaction.
  - It does not use DART's official OpenDART API.
  - It does not guarantee accuracy. You are responsible for how you use the information, and this tool provides no warranty.
`;

export const createDartyCliProgram = (): Command =>
  configureCliTransport(new Command())
    .name("darty")
    .description("Tool-friendly DART search and retrieval commands.")
    .option("--debug", "Write execution diagnostics to stderr when available.")
    .helpOption("-h, --help", "Display help.")
    .addHelpCommand("help [command]", "Display help for a command.")
    .addHelpText("after", rootHelpNotes)
    .addCommand(
      createCompanyDetailCommandWithRunner((options) =>
        executeCompanyDetailCommand(options, defaultCompanyDetailExecutor),
      ),
    )
    .addCommand(
      createCompanyRssCommandWithRunner((options) =>
        executeCompanyRssCommand(options, defaultCompanyRssExecutor),
      ),
    )
    .addCommand(
      createDisclosureTypesCommandWithRunner((options) =>
        executeDisclosureTypesCommand(options, defaultDisclosureTypesExecutor),
      ),
    )
    .addCommand(
      createReportGuideCommandWithRunner((options) =>
        executeReportGuideCommand(options, defaultReportGuideExecutor),
      ),
    )
    .addCommand(
      createSearchBodyCommandWithRunner((options) =>
        executeSearchBodyCommand(options, defaultSearchBodyExecutor),
      ),
    )
    .addCommand(
      createSearchCompanyCommandWithRunner((options) =>
        executeSearchCompanyCommand(options, defaultSearchCompanyExecutor),
      ),
    )
    .addCommand(
      createSearchCompanyReportsCommandWithRunner((options) =>
        executeSearchCompanyReportsCommand(
          options,
          defaultSearchCompanyReportsExecutor,
        ),
      ),
    )
    .addCommand(
      createViewReportCommandWithRunner((options) =>
        executeViewReportCommand(options, defaultViewReportExecutor),
      ),
    );

const isDiagnosticLogLevel = (value: string | undefined): boolean =>
  value === "debug" || value === "trace";

const shouldWriteCliDiagnostics = (argv: readonly string[]): boolean =>
  argv.includes("--verbose") ||
  argv.includes("--debug") ||
  isDiagnosticLogLevel(process.env.DARTY_LOG_LEVEL);

const renderDartyCliFailureDiagnostics = (error: unknown): string | undefined => {
  const diagnostics = getErrorDiagnostics(error);
  return diagnostics === undefined
    ? undefined
    : JSON.stringify({ diagnostics }, undefined, 2);
};

const maybeWriteCliFailureDiagnostics = (
  error: unknown,
  argv: readonly string[],
): void => {
  if (!shouldWriteCliDiagnostics(argv)) {
    return;
  }

  const diagnostics = renderDartyCliFailureDiagnostics(error);
  if (diagnostics !== undefined) {
    writeStderr(diagnostics);
  }
};

const renderDartyCliFailureJson = (
  error: unknown,
  argv: readonly string[],
): string => {
  const cliMessage =
    renderCompanyDetailCliErrorMessage(error) ??
    renderCompanyRssCliErrorMessage(error) ??
    renderDisclosureTypesCliErrorMessage(error) ??
    renderSearchBodyCliErrorMessage(error) ??
    renderSearchCompanyCliErrorMessage(error) ??
    renderSearchCompanyReportsCliErrorMessage(error) ??
    renderViewReportCliErrorMessage(error);

  const commandName = getCliCommandName(argv, createDartyCliProgram());

  return renderCliFailureJson(error, {
    ...(cliMessage === undefined ? {} : { message: cliMessage }),
    pretty: shouldPrettyPrintJson(argv),
    ...(commandName === undefined ? {} : { commandName }),
  });
};

export const runDartyCli = async (
  argv: readonly string[] = process.argv,
): Promise<void> => {
  const program = createDartyCliProgram();
  const parseArgv = stripDebugFlag(argv);

  if (parseArgv.length <= 2) {
    program.outputHelp();
    return;
  }

  const unknownCommandName = getUnknownCliCommandName(parseArgv, program);
  if (unknownCommandName !== undefined) {
    writeStdout(
      renderDartyCliFailureJson(
        createUnknownCommandError(unknownCommandName),
        parseArgv,
      ),
    );
    process.exitCode = 1;
    return;
  }

  try {
    await program.parseAsync([...parseArgv]);
  } catch (error) {
    maybeWriteCliFailureDiagnostics(error, argv);
    writeStdout(renderDartyCliFailureJson(error, parseArgv));
    process.exitCode = 1;
  }
};
