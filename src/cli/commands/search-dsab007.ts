import { Command, InvalidArgumentError, Option } from "commander";
import { Effect } from "effect";

import { dsab007ContentsOperationSpec } from "../../tools/operations/dsab007-contents.ts";
import {
  type Dsab007ContentsOperationResult,
  type Dsab007ContentsRawInput,
} from "../../tools/operations/dsab007-contents-input.ts";
import { executeDsab007ContentsOperation } from "../../tools/operations/dsab007-contents-operation.ts";
import type { OperationParameter } from "../../tools/operations/types.ts";

type CliOptionKey = keyof Dsab007ContentsRawInput;
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

type Dsab007ContentsCommandExecutor = {
  readonly runOperation: (
    input: Partial<Dsab007ContentsRawInput> & Record<string, unknown>,
  ) => Promise<Dsab007ContentsOperationResult>;
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
  result: Dsab007ContentsOperationResult,
): string => JSON.stringify(result, null, 2);

const defaultCommandExecutor: Dsab007ContentsCommandExecutor = {
  runOperation: (input) => executeDsab007ContentsOperation(input),
  writeStdout: (text) => {
    console.log(text);
  },
};

/**
 * Runs the contents search only after the shared semantic resolver has accepted
 * the request, then writes exactly one JSON payload to stdout.
 */
export const executeDsab007ContentsCommand = (
  options: CliOptions,
  executor: Dsab007ContentsCommandExecutor = defaultCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(options as Partial<Dsab007ContentsRawInput> & Record<string, unknown>)
    .then((result) => executor.writeStdout(renderDsab007ContentsSearchResult(result)));

export const dsab007Usage = `${buildDsab007ContentsCommand().helpInformation()}${renderSupplementalHelp()}`;

/**
 * Parses user-supplied flags without printing help or exiting the process.
 *
 * This is intentionally transport-only: required fields, defaults, enum
 * choices, and date formats are validated later by the shared semantic
 * resolver.
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
