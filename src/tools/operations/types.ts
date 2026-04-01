/**
 * Transport-agnostic metadata for tool operations.
 *
 * These types let CLI, MCP, or SDK layers describe the same operation surface
 * from one shared contract instead of duplicating flag names, help text, and
 * parameter confidence labels in each transport.
 */
export type OperationParameterStatus =
  | "observed"
  | "inferred"
  | "unverified";

export type OperationExample = {
  readonly description: string;
  readonly argv: readonly string[];
};

/**
 * One caller-visible input exposed by an operation surface.
 *
 * The shape is semantic and transport-neutral, while still carrying the extra
 * metadata a host needs to present the input well: CLI flag names,
 * required/default behavior, and whether the upstream meaning is observed,
 * inferred, or still unverified.
 */
export type OperationParameter = {
  readonly key: string;
  readonly aliases: readonly string[];
  readonly cliFlags: readonly `--${string}`[];
  readonly valueHint?: string | undefined;
  readonly description: string;
  readonly status: OperationParameterStatus;
  readonly required: boolean;
  readonly defaultValue?: string | undefined;
};

/**
 * Complete description of a single operation that higher-level transports can
 * expose without re-encoding usage docs, defaults, or examples.
 */
export type OperationSpec = {
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly parameters: readonly OperationParameter[];
  readonly notes: readonly string[];
  readonly examples: readonly OperationExample[];
};
