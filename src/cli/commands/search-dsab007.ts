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
import type { Dsab007ContentsSearchResult } from "../../dart/dsab007/models.ts";
import { dsab007ContentsOperationSpec } from "../../tools/operations/dsab007-contents.ts";
import type { OperationParameter } from "../../tools/operations/types.ts";

type CliOptionKey = Exclude<keyof Dsab007ContentsSearchInput, "option">;
type CliOptionValue =
  | Dsab007ContentsSortDirection
  | Dsab007ContentsSortField
  | number
  | string;

/**
 * Commander returns only the flags the caller provided. This partial shape lets
 * the CLI keep user intent separate from the DART request defaults applied
 * later in `buildDsab007ContentsSearchInput`.
 */
export type CliOptions = Partial<Record<CliOptionKey, CliOptionValue>>;

type RegisteredOption = {
  readonly key: CliOptionKey;
  readonly attributeName: string;
  readonly option: Option;
};

type Dsab007ContentsCommandExecutor = {
  readonly runSearch: (
    input: Dsab007ContentsSearchInput,
  ) => Promise<Dsab007ContentsSearchResult>;
  readonly writeStdout: (text: string) => void;
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

/**
 * Normalizes parsed CLI flags into the DART-shaped contents request.
 *
 * Defaults live here instead of in Commander so tests and non-CLI callers share
 * the same fallback behavior, while omitted optional filters remain `undefined`.
 */
export const buildDsab007ContentsSearchInput = (
  options: CliOptions,
): Dsab007ContentsSearchInput => ({
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

const renderDsab007ContentsSearchResult = (
  result: Dsab007ContentsSearchResult,
): string => JSON.stringify(result, null, 2);

const defaultCommandExecutor: Dsab007ContentsCommandExecutor = {
  runSearch: (input) => Effect.runPromise(searchDsab007Contents(input)),
  writeStdout: (text) => {
    console.log(text);
  },
};

/**
 * Runs the contents search and writes exactly one JSON payload to stdout.
 *
 * The executor seam keeps transport and output wiring replaceable in tests
 * without changing the command contract exposed to real CLI callers.
 */
export const executeDsab007ContentsCommand = (
  options: CliOptions,
  executor: Dsab007ContentsCommandExecutor = defaultCommandExecutor,
): Promise<void> =>
  executor
    .runSearch(buildDsab007ContentsSearchInput(options))
    .then((result) => executor.writeStdout(renderDsab007ContentsSearchResult(result)));

export const dsab007Usage = `${buildDsab007ContentsCommand().helpInformation()}${renderSupplementalHelp()}`;

/**
 * Parses user-supplied flags without printing help or exiting the process.
 *
 * Callers still get Commander validation errors, but they can decide how to
 * surface those errors instead of letting Commander write directly to stdio.
 */
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

/**
 * Exposes the command builder with injectable execution for tests and other
 * hosts that need the same CLI surface with custom side effects.
 */
export const createDsab007ContentsCommandWithRunner = (
  onRun: (options: CliOptions) => Promise<void>,
): Command => buildDsab007ContentsCommand(onRun);

export const createDsab007ContentsCommand = (): Command =>
  buildDsab007ContentsCommand(executeDsab007ContentsCommand);

/**
 * Adapts the Commander promise API into an `Effect` so higher-level runners can
 * keep CLI execution inside the project's shared error-handling model.
 */
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
