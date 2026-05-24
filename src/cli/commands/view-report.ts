import { Command, InvalidArgumentError } from "commander";

import { responseDetailCliDescriptions } from "../../capabilities/response-detail.ts";
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
    throw new InvalidArgumentError("Expected an integer greater than or equal to 1.");
  }

  return parsed;
};

const parseContentStartByteOption = (value: string): number => {
  if (!/^-?\d+$/.test(value)) {
    throw new InvalidArgumentError(viewReportCliCopy.invalidInteger(value));
  }

  const parsed = Number.parseInt(value, 10);

  if (parsed < 0) {
    throw new InvalidArgumentError("Expected an integer greater than or equal to 0.");
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
  createRegisteredOption(
    "contentStartByte",
    "--content-start-byte <number>",
    viewReportFieldCopy.contentStartByte.cliDescription,
    (option) => {
      option.argParser((value) => parseContentStartByteOption(value));
    },
  ),
  createRegisteredOption(
    "detail",
    "--detail <concise|detailed|raw>",
    responseDetailCliDescriptions.viewReport,
  ),
  createVerboseOption(
    "Include locator fields (documents/toc) and diagnostics omitted from the default CLI output. If --detail is omitted, request detail=raw.",
  ),
  createRegisteredOption(
    "tocDepth",
    "--toc-depth <number>",
    "Print the TOC only to the specified depth. For section body output, this also enables TOC inclusion.",
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
    .map((example) => {
      const invocation =
        "argv" in example ? example.argv.join(" ") : example.command;

      return `  # ${example.description}\n  darty ${viewReportOperationName} ${invocation}`;
    })
    .join("\n\n");

  const notes = viewReportCliCopy.notes.map((note) => `  - ${note}`).join("\n");
  const notesSection =
    notes.length > 0 ? `\n\n${viewReportCliCopy.notesHeading}:\n${notes}` : "";

  return `\n${viewReportCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const toViewReportCliCommand = (
  options: ViewReportCliOptions,
): ViewReportCliCommand => {
  const output = {
    ...createCliVerboseOutputOptions(options),
    ...(typeof options.tocDepth === "number" ? { tocDepth: options.tocDepth } : {}),
  };

  const requestOptions =
    options.detail !== undefined
      ? options
      : options.verbose === true
        ? { ...options, detail: "raw" }
        : typeof options.tocDepth === "number"
          ? { ...options, detail: "detailed" }
          : options;

  return splitCliCommandOptions<
    ViewReportRawInput,
    CliOptionKey,
    ViewReportCliVerboseOutputOptions
  >(
    requestOptions,
    ["pretty", "verbose", "tocDepth"],
    output,
  );
};

const buildViewReportCommand = (
  onRun?: (command: ViewReportCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = configureCliTransport(new Command(viewReportOperationName))
    .summary(viewReportCliCopy.summary)
    .description(viewReportToolCopy.description)
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
