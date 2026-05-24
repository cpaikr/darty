import { Command } from "commander";

import { responseDetailCliDescriptions } from "../../capabilities/response-detail.ts";
import {
  searchBodyCliCopy,
  searchBodyFieldCopy,
  searchBodyToolCopy,
} from "../../capabilities/search-body/copy.ts";
import {
  SearchBodyFailure,
  type SearchBodyRawInput,
  type SearchBodyResult,
} from "../../capabilities/search-body/contract.ts";
import { searchBodyOperationName } from "../../capabilities/search-body/spec.ts";
import { toSearchBodyCliResult } from "../presentation/search.ts";
import {
  buildCliNameByOptionKey,
  configureCliTransport,
  createCliVerboseOutputOptions,
  createPrettyOption,
  createRegisteredOption,
  createVerboseOption,
  extractCliOptions,
  parseIntegerCliOption,
  renderCliJson,
  renderInvalidRequestCliErrorMessage,
  splitCliCommandOptions,
  type CliOptions as SharedCliOptions,
  type CliVerboseOutputOptions,
  type ParsedCliCommand,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof SearchBodyRawInput | "pretty" | "verbose";

/**
 * Commander returns only the flags the caller provided. This partial shape lets
 * the CLI preserve caller intent until the shared semantic resolver applies
 * defaults and validates the domain contract.
 */
export type CliOptions = SharedCliOptions<CliOptionKey>;
export type SearchBodyCliCommand = ParsedCliCommand<
  SearchBodyRawInput,
  CliVerboseOutputOptions
>;

export type SearchBodyCommandExecutor = {
  readonly runOperation: (
    input: Partial<SearchBodyRawInput> & Record<string, unknown>,
  ) => Promise<SearchBodyResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number =>
  parseIntegerCliOption(value, searchBodyCliCopy.invalidInteger);

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
  createRegisteredOption(
    "page",
    "--page <number>",
    searchBodyFieldCopy.page.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createRegisteredOption(
    "sortBy",
    "--sort-by <date|reportName>",
    searchBodyFieldCopy.sortBy.cliDescription,
  ),
  createRegisteredOption(
    "sortDirection",
    "--sort-direction <asc|desc>",
    searchBodyFieldCopy.sortDirection.cliDescription,
  ),
  createRegisteredOption(
    "detail",
    "--detail <concise|detailed|raw>",
    responseDetailCliDescriptions.sourceEvidence,
  ),
  createRegisteredOption(
    "keyword",
    "--keyword <text>",
    searchBodyFieldCopy.keyword.cliDescription,
  ),
  createRegisteredOption(
    "startDate",
    "--start-date <YYYYMMDD>",
    searchBodyFieldCopy.startDate.cliDescription,
  ),
  createRegisteredOption(
    "endDate",
    "--end-date <YYYYMMDD>",
    searchBodyFieldCopy.endDate.cliDescription,
  ),
  createRegisteredOption(
    "companyCode",
    "--company-code <text>",
    searchBodyFieldCopy.companyCode.cliDescription,
  ),
  createRegisteredOption(
    "presenterName",
    "--presenter-name <text>",
    searchBodyFieldCopy.presenterName.cliDescription,
  ),
  createRegisteredOption(
    "reportName",
    "--report-name <text>",
    searchBodyFieldCopy.reportName.cliDescription,
  ),
  createPrettyOption(),
  createVerboseOption(
    "Include source evidence and diagnostic fields omitted from the default CLI output. If --detail is omitted, request detail=raw.",
  ),
];

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderSearchBodyCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof SearchBodyFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
};

const renderSupplementalHelp = (): string => {
  const examples = searchBodyCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${searchBodyOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  const notes = searchBodyCliCopy.notes
    .map((note) => `  - ${note}`)
    .join("\n");
  const notesSection =
    notes.length > 0
      ? `\n\n${searchBodyCliCopy.notesHeading}:\n${notes}`
      : "";

  return `\n${searchBodyCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const toSearchBodyCliCommand = (options: CliOptions): SearchBodyCliCommand => {
  const requestOptions =
    options.verbose === true && options.detail === undefined
      ? { ...options, detail: "raw" }
      : options;

  return splitCliCommandOptions<
    SearchBodyRawInput,
    CliOptionKey,
    CliVerboseOutputOptions
  >(
    requestOptions,
    ["pretty", "verbose"],
    createCliVerboseOutputOptions(options),
  );
};

const buildSearchBodyCommand = (
  onRun?: (command: SearchBodyCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = configureCliTransport(new Command(searchBodyOperationName))
    .summary(searchBodyCliCopy.summary)
    .description(searchBodyToolCopy.description)
    .helpOption("-h, --help", "Display command help.")
    .addHelpText("after", renderSupplementalHelp());

  for (const registeredOption of registeredOptions) {
    command.addOption(registeredOption.option);
  }

  if (onRun !== undefined) {
    command.action(() => {
      const options = extractCliOptions(
        command.opts<Record<string, unknown>>(),
        registeredOptions,
      );

      return onRun(toSearchBodyCliCommand(options));
    });
  }

  return command;
};

const renderSearchBodyResult = (
  result: SearchBodyResult,
  output: CliVerboseOutputOptions,
): string => renderCliJson(toSearchBodyCliResult(result, output), output);

/**
 * Runs the search-body operation only after the shared semantic resolver has accepted
 * the request, then writes exactly one JSON payload to stdout.
 */
export const executeSearchBodyCommand = (
  command: SearchBodyCliCommand,
  executor: SearchBodyCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderSearchBodyResult(result, command.output)),
    );

export const searchBodyUsage = `${buildSearchBodyCommand().helpInformation()}${renderSupplementalHelp()}`;

/**
 * Parses user-supplied flags without printing help or exiting the process.
 *
 * This is intentionally transport-only: required fields, defaults, enum
 * choices, and date formats are validated later by the shared semantic
 * resolver.
 */
export const parseSearchBodyCommandArgs = (
  argv: string[],
): SearchBodyCliCommand => {
  const command = buildSearchBodyCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toSearchBodyCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

/**
 * Exposes the command builder with injectable execution for tests and other
 * hosts that need the same CLI surface with custom side effects.
 */
export const createSearchBodyCommandWithRunner = (
  onRun: (command: SearchBodyCliCommand) => Promise<void>,
): Command => buildSearchBodyCommand(onRun);
