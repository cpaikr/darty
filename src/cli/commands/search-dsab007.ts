import { Command, InvalidArgumentError, Option } from "commander";
import { Effect } from "effect";

import { searchDsab007Contents } from "../../dart/dsab007/client.ts";
import {
  dsab007ContentsSortDirections,
  dsab007ContentsSortFields,
  type Dsab007ContentsSortDirection,
  type Dsab007ContentsSortField,
  type Dsab007ContentsSearchInput,
} from "../../dart/dsab007/contracts.ts";
import { dsab007ContentsOperationSpec } from "../../tools/operations/dsab007-contents.ts";
import type { OperationParameter } from "../../tools/operations/types.ts";

type CliOptionKey = Exclude<keyof Dsab007ContentsSearchInput, "option">;
type CliOptionValue =
  | Dsab007ContentsSortDirection
  | Dsab007ContentsSortField
  | number
  | string;
type CliOptions = Partial<Record<CliOptionKey, CliOptionValue>>;

type RegisteredOption = {
  readonly key: CliOptionKey;
  readonly attributeName: string;
  readonly option: Option;
};

const parseIntegerOption = (value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(`Expected an integer but received "${value}".`);
  }

  return Number.parseInt(value, 10);
};

const formatOptionFlags = (parameter: OperationParameter): string => {
  const flags = parameter.cliFlags.join(", ");
  return parameter.valueHint === undefined
    ? flags
    : `${flags} ${parameter.valueHint}`;
};

const formatParameterDescription = (parameter: OperationParameter): string => {
  const details = [
    `${parameter.description} [${parameter.status}]`,
    parameter.required ? "Required." : undefined,
    parameter.defaultValue === undefined
      ? undefined
      : `Default: ${parameter.defaultValue}.`,
  ].filter((value) => value !== undefined);

  return details.join(" ");
};

const buildRegisteredOption = (
  parameter: OperationParameter,
): RegisteredOption => {
  const option = new Option(
    formatOptionFlags(parameter),
    formatParameterDescription(parameter),
  );

  if (parameter.required) {
    option.makeOptionMandatory();
  }

  switch (parameter.key) {
    case "currentPage":
    case "maxLinks":
    case "maxResults":
      option.argParser((value) => parseIntegerOption(value));
      break;
    case "sort":
      option.choices(dsab007ContentsSortFields);
      break;
    case "sortType":
      option.choices(dsab007ContentsSortDirections);
      break;
  }

  return {
    key: parameter.key as CliOptionKey,
    attributeName: option.attributeName(),
    option,
  };
};

const extractCliOptions = (
  rawOptions: Record<string, unknown>,
  registeredOptions: readonly RegisteredOption[],
): CliOptions => {
  const options: CliOptions = {};

  for (const registeredOption of registeredOptions) {
    const value = rawOptions[registeredOption.attributeName];
    if (value !== undefined) {
      options[registeredOption.key] = value as CliOptionValue;
    }
  }

  return options;
};

const buildSearchInput = (options: CliOptions): Dsab007ContentsSearchInput => ({
  option: "contents",
  currentPage:
    typeof options.currentPage === "number" ? options.currentPage : 1,
  maxResults: typeof options.maxResults === "number" ? options.maxResults : 10,
  maxLinks: typeof options.maxLinks === "number" ? options.maxLinks : 10,
  sort: options.sort === "rpt_nm" ? "rpt_nm" : "DATE",
  sortType: options.sortType === "asc" ? "asc" : "desc",
  keyword: typeof options.keyword === "string" ? options.keyword : "",
  startDate: typeof options.startDate === "string" ? options.startDate : "",
  endDate: typeof options.endDate === "string" ? options.endDate : "",
  textCrpCik:
    typeof options.textCrpCik === "string" ? options.textCrpCik : undefined,
  textCrpNm:
    typeof options.textCrpNm === "string" ? options.textCrpNm : undefined,
  textPresenterNm:
    typeof options.textPresenterNm === "string"
      ? options.textPresenterNm
      : undefined,
  lateKeyword:
    typeof options.lateKeyword === "string" ? options.lateKeyword : undefined,
  flrCik: typeof options.flrCik === "string" ? options.flrCik : undefined,
  dspTypeTab:
    typeof options.dspTypeTab === "string" ? options.dspTypeTab : undefined,
  tocSrch: typeof options.tocSrch === "string" ? options.tocSrch : undefined,
  docType: typeof options.docType === "string" ? options.docType : undefined,
  reportName:
    typeof options.reportName === "string" ? options.reportName : undefined,
  decadeType:
    typeof options.decadeType === "string" ? options.decadeType : undefined,
});

const renderSupplementalHelp = (): string => {
  const examples = dsab007ContentsOperationSpec.examples
    .map(
      (example) =>
        `  # ${example.description}\n  bun run src/cli.ts ${dsab007ContentsOperationSpec.name} ${example.argv.join(" ")}`,
    )
    .join("\n\n");

  const notes = dsab007ContentsOperationSpec.notes
    .map((note) => `  - ${note}`)
    .join("\n");

  return `\nExamples:\n${examples}\n\nNotes:\n${notes}\n`;
};

const buildDsab007ContentsCommand = (
  onRun?: (options: CliOptions) => Promise<void>,
): Command => {
  const registeredOptions = dsab007ContentsOperationSpec.parameters.map(
    buildRegisteredOption,
  );
  const command = new Command(dsab007ContentsOperationSpec.name)
    .summary(dsab007ContentsOperationSpec.summary)
    .description(dsab007ContentsOperationSpec.description)
    .addHelpText("after", renderSupplementalHelp());

  for (const registeredOption of registeredOptions) {
    command.addOption(registeredOption.option);
  }

  if (onRun !== undefined) {
    command.action(() =>
      onRun(
        extractCliOptions(
          command.opts<Record<string, unknown>>(),
          registeredOptions,
        ),
      ),
    );
  }

  return command;
};

const executeDsab007ContentsCommand = (
  options: CliOptions,
): Promise<void> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const result = yield* searchDsab007Contents(buildSearchInput(options));
      yield* Effect.sync(() => {
        console.log(JSON.stringify(result, null, 2));
      });
    }),
  );

export const dsab007Usage = `${buildDsab007ContentsCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseDsab007CommandArgs = (argv: string[]): CliOptions => {
  const command = buildDsab007ContentsCommand().exitOverride();
  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  const registeredOptions = dsab007ContentsOperationSpec.parameters.map(
    buildRegisteredOption,
  );

  return extractCliOptions(
    command.opts<Record<string, unknown>>(),
    registeredOptions,
  );
};

export const createDsab007ContentsCommand = (): Command =>
  buildDsab007ContentsCommand(executeDsab007ContentsCommand);

export const runDsab007ContentsCommand = (
  argv: string[],
): Effect.Effect<void, unknown> =>
  Effect.tryPromise({
    try: () =>
      createDsab007ContentsCommand()
        .parseAsync(argv, { from: "user" })
        .then(() => undefined),
    catch: (error) => error,
  });
