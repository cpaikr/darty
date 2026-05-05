import { Command, InvalidArgumentError, Option } from "commander";

import {
  reportViewCliCopy,
  reportViewFieldCopy,
  reportViewToolCopy,
} from "../../capabilities/report-view/copy.ts";
import {
  ReportViewFailure,
  type ReportViewRawInput,
  type ReportViewResult,
} from "../../capabilities/report-view/contract.ts";
import { reportViewOperationName } from "../../capabilities/report-view/spec.ts";

type CliOptionKey = keyof ReportViewRawInput;
type CliOptionValue = number | string;

export type ReportViewCliOptions = Partial<Record<CliOptionKey, CliOptionValue>> &
  Record<string, unknown>;

type RegisteredOption = {
  readonly key: CliOptionKey;
  readonly attributeName: string;
  readonly cliName: string;
  readonly option: Option;
};

export type ReportViewCommandExecutor = {
  readonly runOperation: (
    input: Partial<ReportViewRawInput> & Record<string, unknown>,
  ) => Promise<ReportViewResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(reportViewCliCopy.invalidInteger(value));
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
    reportViewFieldCopy.receipt.cliDescription,
  ),
  createRegisteredOption(
    "documentId",
    "--document-id <id>",
    reportViewFieldCopy.documentId.cliDescription,
  ),
  createRegisteredOption(
    "sectionId",
    "--section-id <id>",
    reportViewFieldCopy.sectionId.cliDescription,
  ),
  createRegisteredOption(
    "outputFormat",
    "--output-format <html>",
    reportViewFieldCopy.outputFormat.cliDescription,
  ),
  createRegisteredOption(
    "maxBytes",
    "--max-bytes <number>",
    reportViewFieldCopy.maxBytes.cliDescription,
    (option) => {
      option.argParser((value) => parseIntegerOption(value));
    },
  ),
];

const extractCliOptions = (
  rawOptions: Record<string, unknown>,
  registeredOptions: readonly RegisteredOption[],
): ReportViewCliOptions => {
  const options: ReportViewCliOptions = {};

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

export const renderReportViewCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ReportViewFailure)) {
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
  const examples = reportViewCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${reportViewOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  return `\n${reportViewCliCopy.examplesHeading}:\n${examples}\n`;
};

const buildReportViewCommand = (
  onRun?: (options: ReportViewCliOptions) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(reportViewOperationName)
    .summary(reportViewCliCopy.summary)
    .description(reportViewToolCopy.description)
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

const renderReportViewResult = (result: ReportViewResult): string =>
  JSON.stringify(result, null, 2);

export const executeReportViewCommand = (
  options: ReportViewCliOptions,
  executor: ReportViewCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<ReportViewRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderReportViewResult(result)));

export const reportViewUsage = `${buildReportViewCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseReportViewCommandArgs = (argv: string[]): ReportViewCliOptions => {
  const command = buildReportViewCommand().exitOverride();
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

export const createReportViewCommandWithRunner = (
  onRun: (options: ReportViewCliOptions) => Promise<void>,
): Command => buildReportViewCommand(onRun);
