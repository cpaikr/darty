import { Command, InvalidArgumentError, Option } from "commander";
import { Effect } from "effect";

import { contentsSearchOperationSpec } from "../../tools/operations/contents-search.ts";
import {
  type ContentsSearchOperationResult,
  type ContentsSearchRawInput,
} from "../../tools/operations/contents-search-input.ts";
import { executeContentsSearch } from "../../tools/operations/contents-search-operation.ts";
import type { OperationParameter } from "../../tools/operations/types.ts";

type CliOptionKey = keyof ContentsSearchRawInput;
type CliOptionValue = number | string;

/**
 * Commander returns only the flags the caller provided. This partial shape lets
 * the CLI preserve caller intent until the shared semantic resolver applies
 * defaults and validates the domain contract.
 */
export type CliOptions = Partial<Record<CliOptionKey, CliOptionValue>> &
  Record<string, unknown>;

type RegisteredOption = {
  readonly key: CliOptionKey;
  readonly attributeName: string;
  readonly option: Option;
};

type ContentsSearchCommandExecutor = {
  readonly runOperation: (
    input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  ) => Promise<ContentsSearchOperationResult>;
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

  switch (parameter.key) {
    case "page":
    case "limit":
    case "maxLinks":
      option.argParser((value) => parseIntegerOption(value));
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

const renderSupplementalHelp = (): string => {
  const examples = contentsSearchOperationSpec.examples
    .map(
      (example) =>
        `  # ${example.description}\n  bun run src/cli.ts ${contentsSearchOperationSpec.name} ${example.argv.join(" ")}`,
    )
    .join("\n\n");

  const notes = contentsSearchOperationSpec.notes
    .map((note) => `  - ${note}`)
    .join("\n");

  return `\nExamples:\n${examples}\n\nNotes:\n${notes}\n`;
};

const buildContentsSearchCommand = (
  onRun?: (options: CliOptions) => Promise<void>,
): Command => {
  const registeredOptions = contentsSearchOperationSpec.parameters.map(
    buildRegisteredOption,
  );
  const command = new Command(contentsSearchOperationSpec.name)
    .summary(contentsSearchOperationSpec.summary)
    .description(contentsSearchOperationSpec.description)
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

const renderContentsSearchResult = (
  result: ContentsSearchOperationResult,
): string => JSON.stringify(result, null, 2);

const defaultCommandExecutor: ContentsSearchCommandExecutor = {
  runOperation: (input) => executeContentsSearch(input),
  writeStdout: (text) => {
    console.log(text);
  },
};

/**
 * Runs the contents-search operation only after the shared semantic resolver has accepted
 * the request, then writes exactly one JSON payload to stdout.
 */
export const executeContentsSearchCommand = (
  options: CliOptions,
  executor: ContentsSearchCommandExecutor = defaultCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<ContentsSearchRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderContentsSearchResult(result)));

export const contentsSearchUsage = `${buildContentsSearchCommand().helpInformation()}${renderSupplementalHelp()}`;

/**
 * Parses user-supplied flags without printing help or exiting the process.
 *
 * This is intentionally transport-only: required fields, defaults, enum
 * choices, and date formats are validated later by the shared semantic
 * resolver.
 */
export const parseContentsSearchCommandArgs = (argv: string[]): CliOptions => {
  const command = buildContentsSearchCommand().exitOverride();
  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  const registeredOptions = contentsSearchOperationSpec.parameters.map(
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
export const createContentsSearchCommandWithRunner = (
  onRun: (options: CliOptions) => Promise<void>,
): Command => buildContentsSearchCommand(onRun);

export const createContentsSearchCommand = (): Command =>
  buildContentsSearchCommand(executeContentsSearchCommand);

/**
 * Adapts the Commander promise API into an `Effect` so higher-level runners can
 * keep CLI execution inside the project's shared error-handling model.
 */
export const runContentsSearchCommand = (
  argv: string[],
): Effect.Effect<void, unknown> =>
  Effect.tryPromise({
    try: () =>
      createContentsSearchCommand()
        .parseAsync(argv, { from: "user" })
        .then(() => undefined),
    catch: (error) => error,
  });
