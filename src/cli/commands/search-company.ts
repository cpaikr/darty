import { Command } from "commander";

import {
  searchCompanyCliCopy,
  searchCompanyFieldCopy,
  searchCompanyToolCopy,
} from "../../capabilities/search-company/copy.ts";
import {
  SearchCompanyFailure,
  type SearchCompanyRawInput,
  type SearchCompanyResult,
} from "../../capabilities/search-company/contract.ts";
import { searchCompanyOperationName } from "../../capabilities/search-company/spec.ts";
import { toSearchCompanyCliResult } from "../presentation/search.ts";
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

type CliOptionKey = keyof SearchCompanyRawInput | "pretty" | "verbose";

export type CliOptions = SharedCliOptions<CliOptionKey>;
export type SearchCompanyCliCommand = ParsedCliCommand<
  SearchCompanyRawInput,
  CliVerboseOutputOptions
>;

export type SearchCompanyCommandExecutor = {
  readonly runOperation: (
    input: Partial<SearchCompanyRawInput> & Record<string, unknown>,
  ) => Promise<SearchCompanyResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number =>
  parseIntegerCliOption(value, searchCompanyCliCopy.invalidInteger);

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
  createRegisteredOption(
    "companyName",
    "--company-name <text>",
    searchCompanyFieldCopy.companyName.cliDescription,
  ),
  createRegisteredOption(
    "page",
    "--page <number>",
    searchCompanyFieldCopy.page.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createRegisteredOption(
    "pageSize",
    "--page-size <number>",
    searchCompanyFieldCopy.pageSize.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createPrettyOption(),
  createVerboseOption(),
];

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderSearchCompanyCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof SearchCompanyFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
};

const renderSupplementalHelp = (): string => {
  const examples = searchCompanyCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${searchCompanyOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  const notes = searchCompanyCliCopy.notes.map((note) => `  - ${note}`).join("\n");
  const notesSection =
    notes.length > 0
      ? `\n\n${searchCompanyCliCopy.notesHeading}:\n${notes}`
      : "";

  return `\n${searchCompanyCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const toSearchCompanyCliCommand = (
  options: CliOptions,
): SearchCompanyCliCommand =>
  splitCliCommandOptions<
    SearchCompanyRawInput,
    CliOptionKey,
    CliVerboseOutputOptions
  >(
    options,
    ["pretty", "verbose"],
    createCliVerboseOutputOptions(options),
  );

const buildSearchCompanyCommand = (
  onRun?: (command: SearchCompanyCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = configureCliTransport(new Command(searchCompanyOperationName))
    .summary(searchCompanyCliCopy.summary)
    .description(searchCompanyToolCopy.description)
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

      return onRun(toSearchCompanyCliCommand(options));
    });
  }

  return command;
};

const renderSearchCompanyResult = (
  result: SearchCompanyResult,
  output: CliVerboseOutputOptions,
): string => renderCliJson(toSearchCompanyCliResult(result, output), output);

export const executeSearchCompanyCommand = (
  command: SearchCompanyCliCommand,
  executor: SearchCompanyCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderSearchCompanyResult(result, command.output)),
    );

export const searchCompanyUsage = `${buildSearchCompanyCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseSearchCompanyCommandArgs = (
  argv: string[],
): SearchCompanyCliCommand => {
  const command = buildSearchCompanyCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toSearchCompanyCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

export const createSearchCompanyCommandWithRunner = (
  onRun: (command: SearchCompanyCliCommand) => Promise<void>,
): Command => buildSearchCompanyCommand(onRun);
