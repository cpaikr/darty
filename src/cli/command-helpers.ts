import { Command, InvalidArgumentError, Option } from "commander";

export type CliOptionValue = boolean | number | string | readonly string[];

/**
 * Commander normally exits the process for both help and parse failures. The CLI
 * keeps help as text, but parse failures must flow into the JSON failure writer.
 */
export const exitAfterHelpOrThrowCommanderError = (error: {
  readonly code: string;
  readonly exitCode: number;
}): never => {
  if (error.code === "commander.helpDisplayed") {
    process.exit(error.exitCode);
  }

  throw error;
};

export const configureCliTransport = (command: Command): Command =>
  command.exitOverride(exitAfterHelpOrThrowCommanderError).configureOutput({
    writeErr: () => undefined,
  });

export type CliJsonOptions = {
  readonly pretty: boolean;
};

export type CliVerboseOutputOptions = CliJsonOptions & {
  readonly verbose: boolean;
};

export type ParsedCliCommand<
  RequestInput,
  OutputOptions extends CliJsonOptions = CliJsonOptions,
> = {
  readonly request: Partial<RequestInput> & Record<string, unknown>;
  readonly output: OutputOptions;
};

export type RegisteredOption<Key extends string> = {
  readonly key: Key;
  readonly attributeName: string;
  readonly cliName: string;
  readonly option: Option;
};

export type CliOptions<Key extends string> = Partial<
  Record<Key, CliOptionValue>
> &
  Record<string, unknown>;

export const parseIntegerCliOption = (
  value: string,
  invalidMessage: (value: string) => string,
): number => {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(invalidMessage(value));
  }

  return Number.parseInt(value, 10);
};

export const createRegisteredOption = <Key extends string>(
  key: Key,
  flags: string,
  description: string,
  configure?: (option: Option) => void,
): RegisteredOption<Key> => {
  const option = new Option(flags, description);
  const cliName = flags
    .split(/[ ,]+/)
    .find((token) => token.startsWith("--"));

  if (cliName === undefined) {
    throw new Error(`Missing long flag for CLI option ${key}.`);
  }

  configure?.(option);

  return {
    key,
    attributeName: option.attributeName(),
    cliName,
    option,
  };
};

export const extractCliOptions = <Key extends string>(
  rawOptions: Record<string, unknown>,
  registeredOptions: readonly RegisteredOption<Key>[],
): CliOptions<Key> => {
  const options: CliOptions<Key> = {};

  for (const registeredOption of registeredOptions) {
    const value = rawOptions[registeredOption.attributeName];
    if (value !== undefined) {
      (options as Record<string, CliOptionValue>)[registeredOption.key] =
        value as CliOptionValue;
    }
  }

  return options;
};

export const buildCliNameByOptionKey = <Key extends string>(
  registeredOptions: readonly RegisteredOption<Key>[],
): Partial<Record<Key, string>> =>
  Object.fromEntries(
    registeredOptions.map((option) => [option.key, option.cliName]),
  ) as Partial<Record<Key, string>>;

export const renderInvalidRequestCliErrorMessage = <Key extends string>(
  error: {
    readonly code: string;
    readonly parameter?: string | undefined;
    readonly message: string;
  },
  cliNameByOptionKey: Partial<Record<Key, string>>,
): string | undefined => {
  if (error.code !== "invalid_request" || error.parameter === undefined) {
    return undefined;
  }

  const cliName = cliNameByOptionKey[error.parameter as Key];

  if (cliName === undefined) {
    return undefined;
  }

  return error.message
    .replaceAll(`"${error.parameter}"`, `"${cliName}"`)
    .replaceAll("필수 매개변수", "필수 옵션")
    .replaceAll("매개변수", "옵션");
};

export const createPrettyOption = (): RegisteredOption<"pretty"> =>
  createRegisteredOption(
    "pretty",
    "--pretty",
    "사람이 읽기 쉬운 들여쓰기 JSON으로 출력합니다.",
  );

export const createVerboseOption = (): RegisteredOption<"verbose"> =>
  createRegisteredOption(
    "verbose",
    "--verbose",
    "기본 출력에서 생략하는 진단/출처 필드를 포함합니다.",
  );

export const createCliJsonOptions = (
  options: Record<string, unknown>,
): CliJsonOptions => ({
  pretty: options.pretty === true,
});

export const createCliVerboseOutputOptions = (
  options: Record<string, unknown>,
): CliVerboseOutputOptions => ({
  ...createCliJsonOptions(options),
  verbose: options.verbose === true,
});

export const splitCliCommandOptions = <
  RequestInput,
  Key extends string,
  OutputOptions extends CliJsonOptions = CliJsonOptions,
>(
  options: CliOptions<Key>,
  outputKeys: readonly Key[],
  output: OutputOptions,
): ParsedCliCommand<RequestInput, OutputOptions> => {
  const outputKeySet = new Set<string>(outputKeys);
  const request = Object.fromEntries(
    Object.entries(options).filter(([key]) => !outputKeySet.has(key)),
  );

  return {
    request: request as Partial<RequestInput> & Record<string, unknown>,
    output,
  };
};

export type CliFailureCode =
  | "invalid_request"
  | "not_found"
  | "source_unavailable"
  | "source_changed"
  | "source_parse_failure"
  | "internal_error";

export type CliFailureError = {
  readonly code: CliFailureCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly parameter?: string;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;
};

export type CliFailureEnvelope = {
  readonly result: null;
  readonly metadata: {
    readonly cliTransportVersion: "1";
  };
  readonly references: Record<string, never>;
  readonly warnings: readonly [];
  readonly error: CliFailureError;
};

export const renderCliJson = (
  value: unknown,
  options: Partial<CliJsonOptions> = {},
): string =>
  JSON.stringify(value, undefined, options.pretty === true ? 2 : undefined);

export const renderCliFailureJson = (
  error: unknown,
  options: Partial<CliJsonOptions> & { readonly message?: string } = {},
): string => renderCliJson(toCliFailureEnvelope(error, options.message), options);

const toCliFailureEnvelope = (
  error: unknown,
  messageOverride: string | undefined,
): CliFailureEnvelope => ({
  result: null,
  metadata: {
    cliTransportVersion: "1",
  },
  references: {},
  warnings: [],
  error: toCliFailureError(error, messageOverride),
});

const toCliFailureError = (
  error: unknown,
  messageOverride: string | undefined,
): CliFailureError => {
  const message = messageOverride ?? toErrorMessage(error);

  if (isTypedCliFailure(error)) {
    const fields = {
      code: error.code,
      message,
      retryable: error.retryable,
    } satisfies CliFailureError;

    return {
      ...fields,
      ...(error.parameter === undefined ? {} : { parameter: error.parameter }),
      ...(error.sourceUrl === undefined ? {} : { sourceUrl: error.sourceUrl }),
      ...(error.recoveryHint === undefined
        ? {}
        : { recoveryHint: error.recoveryHint }),
    };
  }

  if (isCommanderError(error)) {
    return {
      code: "invalid_request",
      message,
      retryable: false,
    };
  }

  return {
    code: "internal_error",
    message,
    retryable: false,
  };
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const cliFailureCodes = new Set<string>([
  "invalid_request",
  "not_found",
  "source_unavailable",
  "source_changed",
  "source_parse_failure",
  "internal_error",
]);

const isTypedCliFailure = (
  error: unknown,
): error is {
  readonly code: CliFailureCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly parameter?: string | undefined;
  readonly sourceUrl?: string | undefined;
  readonly recoveryHint?: string | undefined;
} =>
  isRecord(error) &&
  typeof error.code === "string" &&
  cliFailureCodes.has(error.code) &&
  typeof error.message === "string" &&
  typeof error.retryable === "boolean" &&
  isOptionalString(error.parameter) &&
  isOptionalString(error.sourceUrl) &&
  isOptionalString(error.recoveryHint);

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

const isCommanderError = (error: unknown): boolean =>
  isRecord(error) &&
  typeof error.code === "string" &&
  error.code.startsWith("commander.");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";
