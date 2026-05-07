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
  createRegisteredOption,
  extractCliOptions,
  renderInvalidRequestCliErrorMessage,
  type CliOptions as SharedCliOptions,
  type RegisteredOption,
} from "../command-helpers.ts";

type CliOptionKey = keyof CompanyRssRawInput;
export type CompanyRssCliOptions = SharedCliOptions<CliOptionKey>;

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

const buildCompanyRssCommand = (
  onRun?: (options: CompanyRssCliOptions) => Promise<void>,
): Command => {
  const registeredOptions = buildRegisteredOptions();
  const command = new Command(companyRssOperationName)
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

      return onRun(options);
    });
  }

  return command;
};

const renderCompanyRssResult = (result: CompanyRssResult): string =>
  JSON.stringify(result, null, 2);

export const executeCompanyRssCommand = (
  options: CompanyRssCliOptions,
  executor: CompanyRssCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<CompanyRssRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderCompanyRssResult(result)));

export const companyRssUsage = `${buildCompanyRssCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseCompanyRssCommandArgs = (
  argv: string[],
): CompanyRssCliOptions => {
  const command = buildCompanyRssCommand().exitOverride();
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

export const createCompanyRssCommandWithRunner = (
  onRun: (options: CompanyRssCliOptions) => Promise<void>,
): Command => buildCompanyRssCommand(onRun);
