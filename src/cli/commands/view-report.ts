import { Command } from "commander";

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
import {
  buildCliNameByOptionKey,
  createRegisteredOption,
  extractCliOptions,
  parseIntegerCliOption,
  renderInvalidRequestCliErrorMessage,
  type CliOptions,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof ViewReportRawInput;

export type ViewReportCliOptions = CliOptions<CliOptionKey>;

export type ViewReportCommandExecutor = {
  readonly runOperation: (
    input: Partial<ViewReportRawInput> & Record<string, unknown>,
  ) => Promise<ViewReportResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number =>
  parseIntegerCliOption(value, viewReportCliCopy.invalidInteger);

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
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
    "--output-format <html|markdown>",
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

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderViewReportCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ViewReportFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
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
