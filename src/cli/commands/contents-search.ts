import { Command, InvalidArgumentError, Option } from "commander";

import {
  contentsSearchCliCopy,
  contentsSearchFieldCopy,
  contentsSearchToolCopy,
} from "../../capabilities/contents-search/copy.ts";
import {
  ContentsSearchFailure,
  type ContentsSearchRawInput,
  type ContentsSearchResult,
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
  readonly cliName: string;
  readonly option: Option;
};

export type ContentsSearchCommandExecutor = {
  readonly runOperation: (
    input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  ) => Promise<ContentsSearchResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(contentsSearchCliCopy.invalidInteger(value));
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
  const cliName = flags
    .split(/[ ,]+/)
    .find((token) => token.startsWith("--"));

  if (cliName === undefined) {
    throw new Error(`Missing long flag for CLI option ${key}.`);
  }

  configure?.(option);

  return {
    key,
    attributeName: option.attributeName(),
    cliName,
    option,
  };
};

const buildRegisteredOptions = (): readonly RegisteredOption[] => [
  createRegisteredOption(
    "page",
    "--page <number>",
    contentsSearchFieldCopy.page.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
  createRegisteredOption(
    "sortBy",
    "--sort-by <date|reportName>",
    contentsSearchFieldCopy.sortBy.cliDescription,
  ),
  createRegisteredOption(
    "sortDirection",
    "--sort-direction <asc|desc>",
    contentsSearchFieldCopy.sortDirection.cliDescription,
  ),
  createRegisteredOption(
    "keyword",
    "--keyword <text>",
    contentsSearchFieldCopy.keyword.cliDescription,
  ),
  createRegisteredOption(
    "startDate",
    "--start-date <YYYYMMDD>",
    contentsSearchFieldCopy.startDate.cliDescription,
  ),
  createRegisteredOption(
    "endDate",
    "--end-date <YYYYMMDD>",
    contentsSearchFieldCopy.endDate.cliDescription,
  ),
  createRegisteredOption(
    "companyCode",
    "--company-code <text>",
    contentsSearchFieldCopy.companyCode.cliDescription,
  ),
  createRegisteredOption(
    "presenterName",
    "--presenter-name <text>",
    contentsSearchFieldCopy.presenterName.cliDescription,
  ),
  createRegisteredOption(
    "reportName",
    "--report-name <text>",
    contentsSearchFieldCopy.reportName.cliDescription,
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

const cliNameByOptionKey = Object.fromEntries(
  buildRegisteredOptions().map((option) => [option.key, option.cliName]),
) as Partial<Record<CliOptionKey, string>>;

export const renderContentsSearchCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ContentsSearchFailure)) {
    return undefined;
  }

  if (error.code !== "invalid_request") {
    return undefined;
  }

  const cliName = cliNameByOptionKey[error.parameter as CliOptionKey];

  if (cliName === undefined) {
    return undefined;
  }

  return error.message
    .replaceAll(`"${error.parameter}"`, `"${cliName}"`)
    .replaceAll("필수 매개변수", "필수 옵션")
    .replaceAll("매개변수", "옵션");
};

const renderSupplementalHelp = (): string => {
  const examples = contentsSearchCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${contentsSearchOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  const notes = contentsSearchCliCopy.notes
    .map((note) => `  - ${note}`)
    .join("\n");
  const notesSection =
    notes.length > 0
      ? `\n\n${contentsSearchCliCopy.notesHeading}:\n${notes}`
      : "";

  return `\n${contentsSearchCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const buildContentsSearchCommand = (
  onRun?: (options: CliOptions) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(contentsSearchOperationName)
    .summary(contentsSearchCliCopy.summary)
    .description(contentsSearchToolCopy.description)
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
