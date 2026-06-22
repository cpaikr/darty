import { Command } from "commander";

import { responseDetailCliDescriptions } from "../../capabilities/response-detail.ts";
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
import { toSearchCompanyReportsCliResult } from "../presentation/search.ts";
import {
  buildCliNameByOptionKey,
  configureCliTransport,
  createAgentOption,
  createCliAgentOutputOptions,
  createPrettyOption,
  createRegisteredOption,
  createVerboseOption,
  extractCliOptions,
  parseIntegerCliOption,
  renderCliJson,
  renderInvalidRequestCliErrorMessage,
  splitCliCommandOptions,
  type CliOptions as SharedCliOptions,
  type CliAgentOutputOptions,
  type ParsedCliCommand,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey =
  | keyof SearchCompanyReportsRawInput
  | "pretty"
  | "verbose"
  | "agent";

export type CliOptions = SharedCliOptions<CliOptionKey>;
export type SearchCompanyReportsCliCommand = ParsedCliCommand<
  SearchCompanyReportsRawInput,
  CliAgentOutputOptions
>;

export type SearchCompanyReportsCommandExecutor = {
  readonly runOperation: (
    input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
  ) => Promise<SearchCompanyReportsResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number =>
  parseIntegerCliOption(value, searchCompanyReportsCliCopy.invalidInteger);

const collectStringOption = (
  value: string,
  previous: readonly string[] | undefined,
): readonly string[] => [...(previous ?? []), value];

const parseClosingAccountsMonthOption = (value: string): string =>
  /^[1-9]$/.test(value) ? `0${value}` : value;

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
    "presenterName",
    "--presenter-name <text>",
    searchCompanyReportsFieldCopy.presenterName.cliDescription,
  ),
  createRegisteredOption(
    "reportName",
    "--report-name <text>",
    searchCompanyReportsFieldCopy.reportName.cliDescription,
  ),
  createRegisteredOption(
    "disclosureTypes",
    "--disclosure-type <code>",
    searchCompanyReportsFieldCopy.disclosureTypes.cliDescription,
    (option) => {
      option.argParser(collectStringOption);
    },
  ),
  createRegisteredOption(
    "industryCode",
    "--industry-code <code>",
    searchCompanyReportsFieldCopy.industryCode.cliDescription,
  ),
  createRegisteredOption(
    "corporationType",
    "--corporation-type <all|P|A|N|E>",
    searchCompanyReportsFieldCopy.corporationType.cliDescription,
  ),
  createRegisteredOption(
    "closingAccountsMonth",
    "--closing-accounts-month <all|1-12|01-12>",
    searchCompanyReportsFieldCopy.closingAccountsMonth.cliDescription,
    (option) => {
      option.argParser(parseClosingAccountsMonthOption);
    },
  ),
  createRegisteredOption(
    "includeAllReports",
    "--include-all-reports",
    searchCompanyReportsFieldCopy.includeAllReports.cliDescription,
  ),
  createRegisteredOption(
    "detail",
    "--detail <concise|detailed|raw>",
    responseDetailCliDescriptions.sourceEvidence,
  ),
  createPrettyOption(),
  createVerboseOption(
    "Include source evidence and diagnostic fields omitted from the default CLI output. If --detail is omitted, request detail=raw.",
  ),
  createAgentOption(),
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
): SearchCompanyReportsCliCommand => {
  const requestOptions =
    options.verbose === true && options.detail === undefined
      ? { ...options, detail: "raw" }
      : options;

  return splitCliCommandOptions<
    SearchCompanyReportsRawInput,
    CliOptionKey,
    CliAgentOutputOptions
  >(
    requestOptions,
    ["pretty", "verbose", "agent"],
    createCliAgentOutputOptions(options),
  );
};

const buildSearchCompanyReportsCommand = (
  onRun?: (command: SearchCompanyReportsCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = configureCliTransport(
    new Command(searchCompanyReportsOperationName),
  )
    .summary(searchCompanyReportsCliCopy.summary)
    .description(searchCompanyReportsToolCopy.description)
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

      return onRun(toSearchCompanyReportsCliCommand(options));
    });
  }

  return command;
};

const renderSearchCompanyReportsResult = (
  result: SearchCompanyReportsResult,
  output: CliAgentOutputOptions,
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
