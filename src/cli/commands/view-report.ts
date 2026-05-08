import { Command, InvalidArgumentError } from "commander";

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
  toViewReportCliResult,
  type ViewReportCliVerboseOutputOptions,
} from "../presentation/view-report.ts";
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
  type CliOptions,
  type ParsedCliCommand,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof ViewReportRawInput | "pretty" | "tocDepth" | "verbose";

export type ViewReportCliOptions = CliOptions<CliOptionKey>;
export type ViewReportCliCommand = ParsedCliCommand<
  ViewReportRawInput,
  ViewReportCliVerboseOutputOptions
>;

export type ViewReportCommandExecutor = {
  readonly runOperation: (
    input: Partial<ViewReportRawInput> & Record<string, unknown>,
  ) => Promise<ViewReportResult>;
  readonly writeStdout: (text: string) => void;
};

const parseIntegerOption = (value: string): number =>
  parseIntegerCliOption(value, viewReportCliCopy.invalidInteger);

const parseTocDepthOption = (value: string): number => {
  const parsed = parseIntegerOption(value);

  if (parsed < 1) {
    throw new InvalidArgumentError("1 이상의 정수를 입력해야 합니다.");
  }

  return parsed;
};

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
  createVerboseOption(),
  createRegisteredOption(
    "tocDepth",
    "--toc-depth <number>",
    "목차를 지정한 깊이까지만 출력합니다. 섹션 본문 출력에서는 목차 포함도 함께 켭니다.",
    (option) => {
      option.argParser((value) => parseTocDepthOption(value));
    },
  ),
  createPrettyOption(),
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

const toViewReportCliCommand = (
  options: ViewReportCliOptions,
): ViewReportCliCommand => {
  const output = {
    ...createCliVerboseOutputOptions(options),
    ...(typeof options.tocDepth === "number" ? { tocDepth: options.tocDepth } : {}),
  };

  return splitCliCommandOptions<
    ViewReportRawInput,
    CliOptionKey,
    ViewReportCliVerboseOutputOptions
  >(
    options,
    ["pretty", "verbose", "tocDepth"],
    output,
  );
};

const buildViewReportCommand = (
  onRun?: (command: ViewReportCliCommand) => Promise<void>,
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

      return onRun(toViewReportCliCommand(options));
    });
  }

  return command;
};

const renderViewReportResult = (
  result: ViewReportResult,
  output: ViewReportCliVerboseOutputOptions,
): string => renderCliJson(toViewReportCliResult(result, output), output);

export const executeViewReportCommand = (
  command: ViewReportCliCommand,
  executor: ViewReportCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderViewReportResult(result, command.output)),
    );

export const viewReportUsage = `${buildViewReportCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseViewReportCommandArgs = (
  argv: string[],
): ViewReportCliCommand => {
  const command = buildViewReportCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toViewReportCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

export const createViewReportCommandWithRunner = (
  onRun: (command: ViewReportCliCommand) => Promise<void>,
): Command => buildViewReportCommand(onRun);
