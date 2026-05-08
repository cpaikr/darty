import { InvalidArgumentError, Option } from "commander";

export type CliOptionValue = boolean | number | string;

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

export const renderCliJson = (
  value: unknown,
  options: Partial<CliJsonOptions> = {},
): string =>
  JSON.stringify(value, undefined, options.pretty === true ? 2 : undefined);
