import { Command, InvalidArgumentError, Option } from "commander";

import type {
  ContentsSearchRawInput,
  ContentsSearchResult,
} from "../../capabilities/contents-search/contract.ts";
import { contentsSearchOperationName } from "../../capabilities/contents-search/spec.ts";

type CliOptionKey = keyof ContentsSearchRawInput;
type CliOptionValue = number | string;

/**
 * Commander returns only the flags the caller provided. This partial shape lets
 * the CLI preserve caller intent until the shared semantic resolver applies
 * defaults and validates the domain contract.
 */
export type CliOptions = Partial<Record<CliOptionKey, CliOptionValue>> &
  Record<string, unknown>;

type RegisteredOption = {
  readonly key: CliOptionKey;
  readonly attributeName: string;
  readonly option: Option;
};

export type ContentsSearchCommandExecutor = {
  readonly runOperation: (
    input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  ) => Promise<ContentsSearchResult>;
  readonly writeStdout: (text: string) => void;
};

const commandSummary = "Search DART filing contents and return structured JSON.";
const commandDescription =
  "Semantic, read-only access to DART filing contents search backed by an internal dsab007 replay adapter.";

const supplementalNotes = [
  "The command accepts semantic parameter names only; DART replay field names stay internal.",
  "DART currently controls page size and pager width for this mode, so those knobs are not part of the public capability contract.",
  "The result groups stable public fields, references, and source evidence instead of echoing parser-owned source rows directly.",
  "Warnings report partial source drift such as dropped rows while preserving recoverable results.",
] as const;

const commandExamples = [
  {
    description: "Search recent contents matches for a keyword.",
    argv: [
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
    ],
  },
  {
    description: "Narrow results with observed company-code and presenter filters.",
    argv: [
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--company-code",
      "01368637",
      "--presenter-name",
      "유일에너테크",
      "--sort-by",
      "reportName",
    ],
  },
] as const;

const parseIntegerOption = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(`Expected an integer but received "${value}".`);
  }

  return Number.parseInt(value, 10);
};

const createRegisteredOption = (
  key: CliOptionKey,
  flags: string,
  description: string,
  configure?: (option: Option) => void,
): RegisteredOption => {
  const option = new Option(flags, description);

  configure?.(option);

  return {
    key,
    attributeName: option.attributeName(),
    option,
  };
};

const buildRegisteredOptions = (): readonly RegisteredOption[] => [
  createRegisteredOption(
    "page",
    "--page <number>",
    "1-based search results page to request. [observed] Default: 1.",
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createRegisteredOption(
    "sortBy",
    "--sort-by <date|reportName>",
    "Sort field for results. [observed] Default: date.",
  ),
  createRegisteredOption(
    "sortDirection",
    "--sort-direction <asc|desc>",
    "Sort direction for the selected sort field. [observed] Default: desc.",
  ),
  createRegisteredOption(
    "keyword",
    "--keyword <text>",
    "Main body-content search text. [observed] Required.",
  ),
  createRegisteredOption(
    "startDate",
    "--start-date <YYYYMMDD>",
    "Inclusive receipt start date in YYYYMMDD format. [observed] Required.",
  ),
  createRegisteredOption(
    "endDate",
    "--end-date <YYYYMMDD>",
    "Inclusive receipt end date in YYYYMMDD format. [observed] Required.",
  ),
  createRegisteredOption(
    "companyCode",
    "--company-code <text>",
    "Filter by DART company code. [observed]",
  ),
  createRegisteredOption(
    "presenterName",
    "--presenter-name <text>",
    "Filter by presenter name when DART exposes that field. [observed]",
  ),
  createRegisteredOption(
    "reportName",
    "--report-name <text>",
    "Filter by report title as currently honored by DART. [observed]",
  ),
];

const extractCliOptions = (
  rawOptions: Record<string, unknown>,
  registeredOptions: readonly RegisteredOption[],
): CliOptions => {
  const options: CliOptions = {};

  for (const registeredOption of registeredOptions) {
    const value = rawOptions[registeredOption.attributeName];
    if (value !== undefined) {
      options[registeredOption.key] = value as CliOptionValue;
    }
  }

  return options;
};

const renderSupplementalHelp = (): string => {
  const examples = commandExamples
    .map(
      (example) =>
        `  # ${example.description}\n  bun run src/cli.ts ${contentsSearchOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  const notes = supplementalNotes
    .map((note) => `  - ${note}`)
    .join("\n");

  return `\nExamples:\n${examples}\n\nNotes:\n${notes}\n`;
};

const buildContentsSearchCommand = (
  onRun?: (options: CliOptions) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(contentsSearchOperationName)
    .summary(commandSummary)
    .description(commandDescription)
    .addHelpText("after", renderSupplementalHelp());

  for (const registeredOption of registeredOptions) {
    command.addOption(registeredOption.option);
  }

  if (onRun !== undefined) {
    command.action(() =>
      onRun(
        extractCliOptions(
          command.opts<Record<string, unknown>>(),
          registeredOptions,
        ),
      ),
    );
  }

  return command;
};

const renderContentsSearchResult = (
  result: ContentsSearchResult,
): string => JSON.stringify(result, null, 2);

/**
 * Runs the contents-search operation only after the shared semantic resolver has accepted
 * the request, then writes exactly one JSON payload to stdout.
 */
export const executeContentsSearchCommand = (
  options: CliOptions,
  executor: ContentsSearchCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<ContentsSearchRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderContentsSearchResult(result)));

export const contentsSearchUsage = `${buildContentsSearchCommand().helpInformation()}${renderSupplementalHelp()}`;

/**
 * Parses user-supplied flags without printing help or exiting the process.
 *
 * This is intentionally transport-only: required fields, defaults, enum
 * choices, and date formats are validated later by the shared semantic
 * resolver.
 */
export const parseContentsSearchCommandArgs = (argv: string[]): CliOptions => {
  const command = buildContentsSearchCommand().exitOverride();
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
export const createContentsSearchCommandWithRunner = (
  onRun: (options: CliOptions) => Promise<void>,
): Command => buildContentsSearchCommand(onRun);
