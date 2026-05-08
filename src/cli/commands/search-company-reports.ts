import { Command } from "commander";

import {
  searchCompanyReportsCliCopy,
  searchCompanyReportsFieldCopy,
  searchCompanyReportsToolCopy,
} from "../../capabilities/search-company-reports/copy.ts";
import {
  SearchCompanyReportsFailure,
  type SearchCompanyReportsRawInput,
  type SearchCompanyReportsResult,
} from "../../capabilities/search-company-reports/contract.ts";
import { searchCompanyReportsOperationName } from "../../capabilities/search-company-reports/spec.ts";
import {
  buildCliNameByOptionKey,
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

type CliOptionKey = keyof SearchCompanyReportsRawInput | "pretty" | "verbose";

export type CliOptions = SharedCliOptions<CliOptionKey>;
export type SearchCompanyReportsCliCommand = ParsedCliCommand<
  SearchCompanyReportsRawInput,
  CliVerboseOutputOptions
>;

export type SearchCompanyReportsCommandExecutor = {
  readonly runOperation: (
    input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
  ) => Promise<SearchCompanyReportsResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number =>
  parseIntegerCliOption(value, searchCompanyReportsCliCopy.invalidInteger);

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
  createRegisteredOption(
    "companyCode",
    "--company-code <text>",
    searchCompanyReportsFieldCopy.companyCode.cliDescription,
  ),
  createRegisteredOption(
    "startDate",
    "--start-date <YYYYMMDD>",
    searchCompanyReportsFieldCopy.startDate.cliDescription,
  ),
  createRegisteredOption(
    "endDate",
    "--end-date <YYYYMMDD>",
    searchCompanyReportsFieldCopy.endDate.cliDescription,
  ),
  createRegisteredOption(
    "page",
    "--page <number>",
    searchCompanyReportsFieldCopy.page.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createRegisteredOption(
    "pageSize",
    "--page-size <number>",
    searchCompanyReportsFieldCopy.pageSize.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createRegisteredOption(
    "sortDirection",
    "--sort-direction <asc|desc>",
    searchCompanyReportsFieldCopy.sortDirection.cliDescription,
  ),
  createRegisteredOption(
    "includeAllReports",
    "--include-all-reports",
    searchCompanyReportsFieldCopy.includeAllReports.cliDescription,
  ),
  createPrettyOption(),
  createVerboseOption(),
];

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderSearchCompanyReportsCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof SearchCompanyReportsFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
};

const renderSupplementalHelp = (): string => {
  const examples = searchCompanyReportsCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${searchCompanyReportsOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  const notes = searchCompanyReportsCliCopy.notes
    .map((note) => `  - ${note}`)
    .join("\n");
  const notesSection =
    notes.length > 0
      ? `\n\n${searchCompanyReportsCliCopy.notesHeading}:\n${notes}`
      : "";

  return `\n${searchCompanyReportsCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const toSearchCompanyReportsCliCommand = (
  options: CliOptions,
): SearchCompanyReportsCliCommand =>
  splitCliCommandOptions<
    SearchCompanyReportsRawInput,
    CliOptionKey,
    CliVerboseOutputOptions
  >(
    options,
    ["pretty", "verbose"],
    createCliVerboseOutputOptions(options),
  );

const buildSearchCompanyReportsCommand = (
  onRun?: (command: SearchCompanyReportsCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(searchCompanyReportsOperationName)
    .summary(searchCompanyReportsCliCopy.summary)
    .description(searchCompanyReportsToolCopy.description)
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

      return onRun(toSearchCompanyReportsCliCommand(options));
    });
  }

  return command;
};

export type SearchCompanyReportsCompactCliItem = Omit<
  SearchCompanyReportsResult["result"]["items"][number],
  "evidence"
>;

export type SearchCompanyReportsCompactCliResult = Omit<
  SearchCompanyReportsResult,
  "result"
> & {
  readonly result: Omit<SearchCompanyReportsResult["result"], "items"> & {
    readonly items: readonly SearchCompanyReportsCompactCliItem[];
  };
};

export type SearchCompanyReportsCliResult =
  | SearchCompanyReportsResult
  | SearchCompanyReportsCompactCliResult;

export const toSearchCompanyReportsCliResult = (
  result: SearchCompanyReportsResult,
  output: CliVerboseOutputOptions,
): SearchCompanyReportsCliResult => {
  if (output.verbose) {
    return result;
  }

  return {
    ...result,
    result: {
      ...result.result,
      items: result.result.items.map(({ evidence: _evidence, ...item }) => item),
    },
  };
};

const renderSearchCompanyReportsResult = (
  result: SearchCompanyReportsResult,
  output: CliVerboseOutputOptions,
): string =>
  renderCliJson(toSearchCompanyReportsCliResult(result, output), output);

export const executeSearchCompanyReportsCommand = (
  command: SearchCompanyReportsCliCommand,
  executor: SearchCompanyReportsCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderSearchCompanyReportsResult(result, command.output)),
    );

export const searchCompanyReportsUsage = `${buildSearchCompanyReportsCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseSearchCompanyReportsCommandArgs = (
  argv: string[],
): SearchCompanyReportsCliCommand => {
  const command = buildSearchCompanyReportsCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toSearchCompanyReportsCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

export const createSearchCompanyReportsCommandWithRunner = (
  onRun: (command: SearchCompanyReportsCliCommand) => Promise<void>,
): Command => buildSearchCompanyReportsCommand(onRun);
