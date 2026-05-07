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
  createRegisteredOption,
  extractCliOptions,
  renderInvalidRequestCliErrorMessage,
  type CliOptions as SharedCliOptions,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof CompanyDetailRawInput;
export type CompanyDetailCliOptions = SharedCliOptions<CliOptionKey>;

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

const buildCompanyDetailCommand = (
  onRun?: (options: CompanyDetailCliOptions) => Promise<void>,
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

      return onRun(options);
    });
  }

  return command;
};

const renderCompanyDetailResult = (result: CompanyDetailResult): string =>
  JSON.stringify(result, null, 2);

export const executeCompanyDetailCommand = (
  options: CompanyDetailCliOptions,
  executor: CompanyDetailCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<CompanyDetailRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderCompanyDetailResult(result)));

export const companyDetailUsage = `${buildCompanyDetailCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseCompanyDetailCommandArgs = (
  argv: string[],
): CompanyDetailCliOptions => {
  const command = buildCompanyDetailCommand().exitOverride();
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

export const createCompanyDetailCommandWithRunner = (
  onRun: (options: CompanyDetailCliOptions) => Promise<void>,
): Command => buildCompanyDetailCommand(onRun);
