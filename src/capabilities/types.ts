export type CapabilityParameterStatus =
  | "observed"
  | "inferred"
  | "unverified";

export type CapabilityExample = {
  readonly description: string;
  readonly argv: readonly string[];
};

export type CapabilityParameter = {
  readonly key: string;
  readonly aliases: readonly string[];
  readonly cliFlags: readonly `--${string}`[];
  readonly valueHint?: string | undefined;
  readonly description: string;
  readonly status: CapabilityParameterStatus;
  readonly required: boolean;
  readonly defaultValue?: string | undefined;
};

export type CapabilitySpec = {
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly parameters: readonly CapabilityParameter[];
  readonly notes: readonly string[];
  readonly examples: readonly CapabilityExample[];
};
