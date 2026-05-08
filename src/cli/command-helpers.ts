import { InvalidArgumentError, Option } from "commander";

export type CliOptionValue = boolean | number | string;

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
