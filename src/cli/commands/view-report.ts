import { Command, InvalidArgumentError, Option } from "commander";

import {
  viewReportCliCopy,
  viewReportFieldCopy,
  viewReportToolCopy,
} from "../../capabilities/view-report/copy.ts";
import {
  ViewReportFailure,
  type ViewReportRawInput,
  type ViewReportResult,
} from "../../capabilities/view-report/contract.ts";
import { viewReportOperationName } from "../../capabilities/view-report/spec.ts";

type CliOptionKey = keyof ViewReportRawInput;
type CliOptionValue = number | string;

export type ViewReportCliOptions = Partial<Record<CliOptionKey, CliOptionValue>> &
  Record<string, unknown>;

type RegisteredOption = {
  readonly key: CliOptionKey;
  readonly attributeName: string;
  readonly cliName: string;
  readonly option: Option;
};

export type ViewReportCommandExecutor = {
  readonly runOperation: (
    input: Partial<ViewReportRawInput> & Record<string, unknown>,
  ) => Promise<ViewReportResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(viewReportCliCopy.invalidInteger(value));
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
    "receipt",
    "--receipt <receipt-or-url>",
    viewReportFieldCopy.receipt.cliDescription,
  ),
  createRegisteredOption(
    "documentId",
    "--document-id <id>",
    viewReportFieldCopy.documentId.cliDescription,
  ),
  createRegisteredOption(
    "sectionId",
    "--section-id <id>",
    viewReportFieldCopy.sectionId.cliDescription,
  ),
  createRegisteredOption(
    "outputFormat",
    "--output-format <html>",
    viewReportFieldCopy.outputFormat.cliDescription,
  ),
  createRegisteredOption(
    "maxBytes",
    "--max-bytes <number>",
    viewReportFieldCopy.maxBytes.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
];

const extractCliOptions = (
  rawOptions: Record<string, unknown>,
  registeredOptions: readonly RegisteredOption[],
): ViewReportCliOptions => {
  const options: ViewReportCliOptions = {};

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

export const renderViewReportCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ViewReportFailure)) {
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
  const examples = viewReportCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${viewReportOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  return `\n${viewReportCliCopy.examplesHeading}:\n${examples}\n`;
};

const buildViewReportCommand = (
  onRun?: (options: ViewReportCliOptions) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(viewReportOperationName)
    .summary(viewReportCliCopy.summary)
    .description(viewReportToolCopy.description)
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

const renderViewReportResult = (result: ViewReportResult): string =>
  JSON.stringify(result, null, 2);

export const executeViewReportCommand = (
  options: ViewReportCliOptions,
  executor: ViewReportCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<ViewReportRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderViewReportResult(result)));

export const viewReportUsage = `${buildViewReportCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseViewReportCommandArgs = (argv: string[]): ViewReportCliOptions => {
  const command = buildViewReportCommand().exitOverride();
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

export const createViewReportCommandWithRunner = (
  onRun: (options: ViewReportCliOptions) => Promise<void>,
): Command => buildViewReportCommand(onRun);
