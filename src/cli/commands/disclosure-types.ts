import { Command } from "commander";

import {
  disclosureTypesCliCopy,
  disclosureTypesFieldCopy,
  disclosureTypesToolCopy,
} from "../../capabilities/disclosure-types/copy.ts";
import {
  DisclosureTypesFailure,
  type DisclosureTypesRawInput,
  type DisclosureTypesResult,
} from "../../capabilities/disclosure-types/contract.ts";
import { disclosureTypesOperationName } from "../../capabilities/disclosure-types/spec.ts";
import {
  buildCliNameByOptionKey,
  configureCliTransport,
  createCliJsonOptions,
  createPrettyOption,
  createRegisteredOption,
  extractCliOptions,
  renderCliJson,
  renderInvalidRequestCliErrorMessage,
  splitCliCommandOptions,
  type CliJsonOptions,
  type CliOptions as SharedCliOptions,
  type ParsedCliCommand,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof DisclosureTypesRawInput | "pretty";

export type CliOptions = SharedCliOptions<CliOptionKey>;
export type DisclosureTypesCliCommand = ParsedCliCommand<
  DisclosureTypesRawInput,
  CliJsonOptions
>;

export type DisclosureTypesCommandExecutor = {
  readonly runOperation: (
    input: Partial<DisclosureTypesRawInput> & Record<string, unknown>,
  ) => Promise<DisclosureTypesResult>;
  readonly writeStdout: (text: string) => void;
};

const parseCategoryOption = (value: string): string => value.toUpperCase();

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
  createRegisteredOption(
    "category",
    "--category <A-J>",
    disclosureTypesFieldCopy.category.cliDescription,
    (option) => {
      option.argParser(parseCategoryOption);
    },
  ),
  createRegisteredOption(
    "query",
    "--query <text>",
    disclosureTypesFieldCopy.query.cliDescription,
  ),
  createPrettyOption(),
];

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderDisclosureTypesCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof DisclosureTypesFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
};

const renderSupplementalHelp = (): string => {
  const examples = disclosureTypesCliCopy.examples
    .map((example) => {
      const suffix =
        example.argv.length === 0 ? "" : ` ${example.argv.join(" ")}`;

      return `  # ${example.description}\n  darty ${disclosureTypesOperationName}${suffix}`;
    })
    .join("\n\n");

  const notes = disclosureTypesCliCopy.notes.map((note) => `  - ${note}`).join("\n");
  const notesSection =
    notes.length > 0 ? `\n\n${disclosureTypesCliCopy.notesHeading}:\n${notes}` : "";

  return `\n${disclosureTypesCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const toDisclosureTypesCliCommand = (
  options: CliOptions,
): DisclosureTypesCliCommand =>
  splitCliCommandOptions<DisclosureTypesRawInput, CliOptionKey, CliJsonOptions>(
    options,
    ["pretty"],
    createCliJsonOptions(options),
  );

const buildDisclosureTypesCommand = (
  onRun?: (command: DisclosureTypesCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = configureCliTransport(new Command(disclosureTypesOperationName))
    .summary(disclosureTypesCliCopy.summary)
    .description(disclosureTypesToolCopy.description)
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

      return onRun(toDisclosureTypesCliCommand(options));
    });
  }

  return command;
};

const renderDisclosureTypesResult = (
  result: DisclosureTypesResult,
  output: CliJsonOptions,
): string => renderCliJson(result, output);

export const executeDisclosureTypesCommand = (
  command: DisclosureTypesCliCommand,
  executor: DisclosureTypesCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderDisclosureTypesResult(result, command.output)),
    );

export const disclosureTypesUsage = `${buildDisclosureTypesCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseDisclosureTypesCommandArgs = (
  argv: string[],
): DisclosureTypesCliCommand => {
  const command = buildDisclosureTypesCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toDisclosureTypesCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

export const createDisclosureTypesCommandWithRunner = (
  onRun: (command: DisclosureTypesCliCommand) => Promise<void>,
): Command => buildDisclosureTypesCommand(onRun);
