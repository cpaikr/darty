import type {
  Dsab007ContentsSearchParameterStatus,
} from "../../dart/dsab007/contracts.ts";

export type OperationExample = {
  readonly description: string;
  readonly argv: readonly string[];
};

export type OperationParameter = {
  readonly key: string;
  readonly aliases: readonly string[];
  readonly cliFlags: readonly `--${string}`[];
  readonly valueHint?: string | undefined;
  readonly description: string;
  readonly status: Dsab007ContentsSearchParameterStatus;
  readonly required: boolean;
  readonly defaultValue?: string | undefined;
};

export type OperationSpec = {
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly parameters: readonly OperationParameter[];
  readonly notes: readonly string[];
  readonly examples: readonly OperationExample[];
};
