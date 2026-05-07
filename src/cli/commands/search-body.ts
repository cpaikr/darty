import { Command } from "commander";

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
import {
  buildCliNameByOptionKey,
  createRegisteredOption,
  extractCliOptions,
  parseIntegerCliOption,
  renderInvalidRequestCliErrorMessage,
  type CliOptions as SharedCliOptions,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof SearchBodyRawInput;

/**
 * Commander returns only the flags the caller provided. This partial shape lets
 * the CLI preserve caller intent until the shared semantic resolver applies
 * defaults and validates the domain contract.
 */
export type CliOptions = SharedCliOptions<CliOptionKey>;

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

const buildSearchBodyCommand = (
  onRun?: (options: CliOptions) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(searchBodyOperationName)
    .summary(searchBodyCliCopy.summary)
    .description(searchBodyToolCopy.description)
    .helpOption("-h, --help", "명령 도움말을 표시합니다.")
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

      if (Object.keys(options).length === 0) {
        command.outputHelp();
        return undefined;
      }

      return onRun(options);
    });
  }

  return command;
};

const renderSearchBodyResult = (
  result: SearchBodyResult,
): string => JSON.stringify(result, null, 2);

/**
 * Runs the search-body operation only after the shared semantic resolver has accepted
 * the request, then writes exactly one JSON payload to stdout.
 */
export const executeSearchBodyCommand = (
  options: CliOptions,
  executor: SearchBodyCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<SearchBodyRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderSearchBodyResult(result)));

export const searchBodyUsage = `${buildSearchBodyCommand().helpInformation()}${renderSupplementalHelp()}`;

/**
 * Parses user-supplied flags without printing help or exiting the process.
 *
 * This is intentionally transport-only: required fields, defaults, enum
 * choices, and date formats are validated later by the shared semantic
 * resolver.
 */
export const parseSearchBodyCommandArgs = (argv: string[]): CliOptions => {
  const command = buildSearchBodyCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return extractCliOptions(
    command.opts<Record<string, unknown>>(),
    registeredOptions,
  );
};

/**
 * Exposes the command builder with injectable execution for tests and other
 * hosts that need the same CLI surface with custom side effects.
 */
export const createSearchBodyCommandWithRunner = (
  onRun: (options: CliOptions) => Promise<void>,
): Command => buildSearchBodyCommand(onRun);
