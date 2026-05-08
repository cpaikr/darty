import { Command } from "commander";

import {
  companyDetailCliCopy,
  companyDetailFieldCopy,
  companyDetailToolCopy,
} from "../../capabilities/company-detail/copy.ts";
import {
  CompanyDetailFailure,
  type CompanyDetailRawInput,
  type CompanyDetailResult,
} from "../../capabilities/company-detail/contract.ts";
import { companyDetailOperationName } from "../../capabilities/company-detail/spec.ts";
import {
  buildCliNameByOptionKey,
  createCliJsonOptions,
  createPrettyOption,
  createRegisteredOption,
  extractCliOptions,
  renderCliJson,
  renderInvalidRequestCliErrorMessage,
  splitCliCommandOptions,
  type CliOptions as SharedCliOptions,
  type ParsedCliCommand,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof CompanyDetailRawInput | "pretty";
export type CompanyDetailCliOptions = SharedCliOptions<CliOptionKey>;
export type CompanyDetailCliCommand = ParsedCliCommand<CompanyDetailRawInput>;

export type CompanyDetailCommandExecutor = {
  readonly runOperation: (
    input: Partial<CompanyDetailRawInput> & Record<string, unknown>,
  ) => Promise<CompanyDetailResult>;
  readonly writeStdout: (text: string) => void;
};

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
  createRegisteredOption(
    "companyCode",
    "--company-code <text>",
    companyDetailFieldCopy.companyCode.cliDescription,
  ),
  createPrettyOption(),
];

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderCompanyDetailCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof CompanyDetailFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
};

const renderSupplementalHelp = (): string => {
  const examples = companyDetailCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${companyDetailOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  return `\n${companyDetailCliCopy.examplesHeading}:\n${examples}\n`;
};

const toCompanyDetailCliCommand = (
  options: CompanyDetailCliOptions,
): CompanyDetailCliCommand =>
  splitCliCommandOptions<CompanyDetailRawInput, CliOptionKey>(
    options,
    ["pretty"],
    createCliJsonOptions(options),
  );

const buildCompanyDetailCommand = (
  onRun?: (command: CompanyDetailCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(companyDetailOperationName)
    .summary(companyDetailCliCopy.summary)
    .description(companyDetailToolCopy.description)
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

      return onRun(toCompanyDetailCliCommand(options));
    });
  }

  return command;
};

const renderCompanyDetailResult = (
  result: CompanyDetailResult,
  output: CompanyDetailCliCommand["output"],
): string => renderCliJson(result, output);

export const executeCompanyDetailCommand = (
  command: CompanyDetailCliCommand,
  executor: CompanyDetailCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderCompanyDetailResult(result, command.output)),
    );

export const companyDetailUsage = `${buildCompanyDetailCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseCompanyDetailCommandArgs = (
  argv: string[],
): CompanyDetailCliCommand => {
  const command = buildCompanyDetailCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toCompanyDetailCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

export const createCompanyDetailCommandWithRunner = (
  onRun: (command: CompanyDetailCliCommand) => Promise<void>,
): Command => buildCompanyDetailCommand(onRun);
