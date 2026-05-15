import { Command } from "commander";

import {
  companyRssCliCopy,
  companyRssFieldCopy,
  companyRssToolCopy,
} from "../../capabilities/company-rss/copy.ts";
import {
  CompanyRssFailure,
  type CompanyRssRawInput,
  type CompanyRssResult,
} from "../../capabilities/company-rss/contract.ts";
import { companyRssOperationName } from "../../capabilities/company-rss/spec.ts";
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
  type CliOptions as SharedCliOptions,
  type ParsedCliCommand,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof CompanyRssRawInput | "pretty";
export type CompanyRssCliOptions = SharedCliOptions<CliOptionKey>;
export type CompanyRssCliCommand = ParsedCliCommand<CompanyRssRawInput>;

export type CompanyRssCommandExecutor = {
  readonly runOperation: (
    input: Partial<CompanyRssRawInput> & Record<string, unknown>,
  ) => Promise<CompanyRssResult>;
  readonly writeStdout: (text: string) => void;
};

const buildRegisteredOptions = (): readonly RegisteredOption<CliOptionKey>[] => [
  createRegisteredOption(
    "companyCode",
    "--company-code <text>",
    companyRssFieldCopy.companyCode.cliDescription,
  ),
  createPrettyOption(),
];

const cliNameByOptionKey = buildCliNameByOptionKey(buildRegisteredOptions());

export const renderCompanyRssCliErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof CompanyRssFailure)) {
    return undefined;
  }

  return renderInvalidRequestCliErrorMessage(error, cliNameByOptionKey);
};

const renderSupplementalHelp = (): string => {
  const examples = companyRssCliCopy.examples
    .map(
      (example) =>
        `  # ${example.description}\n  darty ${companyRssOperationName} ${example.argv.join(
          " ",
        )}`,
    )
    .join("\n\n");

  return `\n${companyRssCliCopy.examplesHeading}:\n${examples}\n`;
};

const toCompanyRssCliCommand = (
  options: CompanyRssCliOptions,
): CompanyRssCliCommand =>
  splitCliCommandOptions<CompanyRssRawInput, CliOptionKey>(
    options,
    ["pretty"],
    createCliJsonOptions(options),
  );

const buildCompanyRssCommand = (
  onRun?: (command: CompanyRssCliCommand) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = configureCliTransport(new Command(companyRssOperationName))
    .summary(companyRssCliCopy.summary)
    .description(companyRssToolCopy.description)
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

      return onRun(toCompanyRssCliCommand(options));
    });
  }

  return command;
};

const renderCompanyRssResult = (
  result: CompanyRssResult,
  output: CompanyRssCliCommand["output"],
): string => renderCliJson(result, output);

export const executeCompanyRssCommand = (
  command: CompanyRssCliCommand,
  executor: CompanyRssCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) =>
      executor.writeStdout(renderCompanyRssResult(result, command.output)),
    );

export const companyRssUsage = `${buildCompanyRssCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseCompanyRssCommandArgs = (
  argv: string[],
): CompanyRssCliCommand => {
  const command = buildCompanyRssCommand().exitOverride();
  const registeredOptions = buildRegisteredOptions();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toCompanyRssCliCommand(
    extractCliOptions(command.opts<Record<string, unknown>>(), registeredOptions),
  );
};

export const createCompanyRssCommandWithRunner = (
  onRun: (command: CompanyRssCliCommand) => Promise<void>,
): Command => buildCompanyRssCommand(onRun);
