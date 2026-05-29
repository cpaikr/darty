import { defaultCompanyDetailOperation } from "./app/company-detail.ts";
import { defaultCompanyRssOperation } from "./app/company-rss.ts";
import { defaultDisclosureTypesOperation } from "./app/disclosure-types.ts";
import { defaultReportGuideOperation } from "./app/report-guide.ts";
import { defaultSearchBodyOperation } from "./app/search-body.ts";
import { defaultSearchCompanyOperation } from "./app/search-company.ts";
import { defaultSearchCompanyReportsOperation } from "./app/search-company-reports.ts";
import { defaultViewReportOperation } from "./app/view-report.ts";
import {
  companyDetailSchemaCopy,
  companyDetailToolCopy,
} from "./capabilities/company-detail/copy.ts";
import { resolveCompanyDetailRequest } from "./capabilities/company-detail/contract.ts";
import {
  companyRssSchemaCopy,
  companyRssToolCopy,
} from "./capabilities/company-rss/copy.ts";
import { resolveCompanyRssRequest } from "./capabilities/company-rss/contract.ts";
import {
  disclosureTypesCliCopy,
  disclosureTypesSchemaCopy,
  disclosureTypesToolCopy,
} from "./capabilities/disclosure-types/copy.ts";
import { resolveDisclosureTypesRequest } from "./capabilities/disclosure-types/contract.ts";
import {
  reportGuideCliCopy,
  reportGuideSchemaCopy,
  reportGuideToolCopy,
} from "./capabilities/report-guide/copy.ts";
import { resolveReportGuideRequest } from "./capabilities/report-guide/contract.ts";
import { getInvalidRequestRecoveryHint } from "./capabilities/recovery-hints.ts";
import {
  searchBodyCliCopy,
  searchBodySchemaCopy,
  searchBodyToolCopy,
} from "./capabilities/search-body/copy.ts";
import { resolveSearchBodyRequest } from "./capabilities/search-body/contract.ts";
import {
  searchCompanyReportsCliCopy,
  searchCompanyReportsSchemaCopy,
  searchCompanyReportsToolCopy,
} from "./capabilities/search-company-reports/copy.ts";
import { resolveSearchCompanyReportsRequest } from "./capabilities/search-company-reports/contract.ts";
import {
  searchCompanyCliCopy,
  searchCompanySchemaCopy,
  searchCompanyToolCopy,
} from "./capabilities/search-company/copy.ts";
import { resolveSearchCompanyRequest } from "./capabilities/search-company/contract.ts";
import {
  viewReportCliCopy,
  viewReportSchemaCopy,
  viewReportToolCopy,
} from "./capabilities/view-report/copy.ts";
import { resolveViewReportRequest } from "./capabilities/view-report/contract.ts";

export const dartyOperationNames = [
  "search-body",
  "search-company",
  "search-company-reports",
  "company-detail",
  "company-rss",
  "disclosure-types",
  "report-guide",
  "view-report",
] as const;

export type DartyOperationName = (typeof dartyOperationNames)[number];

export type DartyToolRunContext = {
  readonly signal?: AbortSignal;
};

export type DartyOperationSummary = {
  readonly name: DartyOperationName;
  readonly label: string;
  readonly description: string;
};

export type DartyOperationSpec = DartyOperationSummary & {
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly requiredInputKeys: readonly string[];
  readonly examples: readonly Record<string, unknown>[];
  readonly limitations: readonly string[];
  readonly resultSummary: string;
};

export type DartyCommandHelp = DartyOperationSpec;

export type DartyToolsetHelp = {
  readonly id: "darty";
  readonly label: string;
  readonly description: string;
  readonly usage: string;
  readonly operations: readonly DartyOperationSummary[];
  readonly limitations: readonly string[];
  readonly citationGuidance: readonly string[];
};

export type DartyValidationFailureCode =
  | "missing_parameter"
  | "invalid_parameter"
  | "unknown_parameter"
  | "invalid_request";

export type DartyValidationRecoveryAction =
  | { readonly kind: "inspect_tool_help" }
  | {
      readonly kind: "inspect_command_help";
      readonly operationName: DartyOperationName;
    };

export type DartyValidationFailure = {
  readonly code: DartyValidationFailureCode;
  readonly message: string;
  readonly operationName?: string;
  readonly parameter?: string;
  readonly reason?: string;
  readonly expected?: string;
  readonly actual?: unknown;
  readonly recoveryHint?: string;
  readonly exampleInput?: Record<string, unknown>;
  readonly recoverable: true;
  readonly recoveryAction: DartyValidationRecoveryAction;
};

export type DartyValidationResult =
  | { readonly ok: true; readonly input: Record<string, unknown> }
  | { readonly ok: false; readonly error: DartyValidationFailure };

export type DartySerializedError = {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly recoverable?: boolean;
  readonly retryable?: boolean;
  readonly recoveryAction?: DartyValidationRecoveryAction;
  readonly parameter?: string;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;
  readonly operationName?: string;
  readonly reason?: string;
  readonly expected?: string;
  readonly actual?: unknown;
  readonly exampleInput?: Record<string, unknown>;
};

export type DartyToolRunResult = unknown;

export type DartyToolset = {
  readonly id: "darty";
  readonly label: string;
  readonly description: string;
  readonly help: () => DartyToolsetHelp;
  readonly listOperations: () => readonly DartyOperationSummary[];
  readonly getOperation: (name: string) => DartyOperationSpec | undefined;
  readonly getCommandHelp: (name: string) => DartyOperationSpec | undefined;
  readonly validateInput: (
    name: string,
    input: unknown,
  ) => DartyValidationResult;
  readonly serializeError: (error: unknown) => DartySerializedError;
  readonly execute: (
    name: string,
    input: Record<string, unknown>,
    context?: DartyToolRunContext,
  ) => Promise<DartyToolRunResult>;
};

export type DartyToolsetErrorCode =
  | "unknown_operation"
  | "aborted"
  | "validation_failed";

export class DartyToolsetError extends Error {
  override readonly name = "DartyToolsetError";
  readonly code: DartyToolsetErrorCode;
  readonly retryable: boolean;
  readonly operationName: string | undefined;

  constructor(input: {
    readonly code: DartyToolsetErrorCode;
    readonly message: string;
    readonly retryable: boolean;
    readonly operationName?: string;
  }) {
    super(input.message);
    this.code = input.code;
    this.retryable = input.retryable;
    this.operationName = input.operationName;
  }
}

export class DartyToolsetValidationError extends Error {
  override readonly name = "DartyToolsetValidationError";
  readonly code = "validation_failed";
  readonly validation: DartyValidationFailure;
  readonly operationName: string | undefined;
  readonly parameter: string | undefined;
  readonly reason: string | undefined;
  readonly expected: string | undefined;
  readonly actual: unknown;
  readonly recoveryHint: string | undefined;
  readonly exampleInput: Record<string, unknown> | undefined;
  readonly recoverable: true;
  readonly recoveryAction: DartyValidationRecoveryAction;

  constructor(validation: DartyValidationFailure) {
    super(validation.message);
    this.validation = validation;
    this.operationName = validation.operationName;
    this.parameter = validation.parameter;
    this.reason = validation.reason;
    this.expected = validation.expected;
    this.actual = validation.actual;
    this.recoveryHint = validation.recoveryHint;
    this.exampleInput = validation.exampleInput;
    this.recoverable = validation.recoverable;
    this.recoveryAction = validation.recoveryAction;
  }
}

type AppOperation = {
  readonly name: DartyOperationName;
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly execute: (
    input: Record<string, unknown>,
    context?: DartyToolRunContext,
  ) => Promise<unknown>;
};

type OperationDefinition = DartyOperationSummary & {
  readonly operation: AppOperation;
  readonly examples?: readonly Record<string, unknown>[];
  readonly limitations?: readonly string[];
  readonly resultSummary?: string;
  readonly prepareInput?: (input: unknown) => Record<string, unknown>;
};

export type CreateDartyToolsetOptions = {
  /**
   * Override operations for tests or custom hosts. Most callers should use the
   * default DART-backed operations by calling createDartyToolset() with no args.
   */
  readonly operations?: readonly OperationDefinition[];
};

const sourceLimitations = [
  "Darty reads DART public web pages and static DART code material in read-only mode; it is not the official OpenDART API.",
  "DART web behavior can change, so important results should be checked against the returned source references.",
  "Darty does not provide investment, accounting, or legal judgment.",
] as const;

const citationGuidance = [
  "Use result.references, result.metadata, warnings, and original DART viewer/source URLs when presenting findings.",
  "For context-sensitive conclusions, use search operations to find candidates, then view-report to inspect the actual filing body or section.",
] as const;

const defaultOperationDefinitions = [
  {
    name: "search-body",
    label: searchBodyToolCopy.title,
    description: searchBodyToolCopy.description,
    operation: defaultSearchBodyOperation,
    prepareInput: (input) => resolveSearchBodyRequest(input),
    examples: searchBodySchemaCopy.requestExamples,
    limitations: searchBodyCliCopy.notes,
    resultSummary: searchBodySchemaCopy.resultDescription,
  },
  {
    name: "search-company",
    label: searchCompanyToolCopy.title,
    description: searchCompanyToolCopy.description,
    operation: defaultSearchCompanyOperation,
    prepareInput: (input) => resolveSearchCompanyRequest(input),
    examples: searchCompanySchemaCopy.requestExamples,
    limitations: searchCompanyCliCopy.notes,
    resultSummary: searchCompanySchemaCopy.resultDescription,
  },
  {
    name: "search-company-reports",
    label: searchCompanyReportsToolCopy.title,
    description: searchCompanyReportsToolCopy.description,
    operation: defaultSearchCompanyReportsOperation,
    prepareInput: (input) => resolveSearchCompanyReportsRequest(input),
    examples: searchCompanyReportsSchemaCopy.requestExamples,
    limitations: searchCompanyReportsCliCopy.notes,
    resultSummary: searchCompanyReportsSchemaCopy.resultDescription,
  },
  {
    name: "company-detail",
    label: companyDetailToolCopy.title,
    description: companyDetailToolCopy.description,
    operation: defaultCompanyDetailOperation,
    prepareInput: (input) => resolveCompanyDetailRequest(input),
    examples: companyDetailSchemaCopy.requestExamples,
    resultSummary: companyDetailSchemaCopy.resultDescription,
  },
  {
    name: "company-rss",
    label: companyRssToolCopy.title,
    description: companyRssToolCopy.description,
    operation: defaultCompanyRssOperation,
    prepareInput: (input) => resolveCompanyRssRequest(input),
    examples: companyRssSchemaCopy.requestExamples,
    resultSummary: companyRssSchemaCopy.resultDescription,
  },
  {
    name: "disclosure-types",
    label: disclosureTypesToolCopy.title,
    description: disclosureTypesToolCopy.description,
    operation: defaultDisclosureTypesOperation,
    prepareInput: (input) => resolveDisclosureTypesRequest(input),
    examples: disclosureTypesSchemaCopy.requestExamples,
    limitations: disclosureTypesCliCopy.notes,
    resultSummary: disclosureTypesSchemaCopy.resultDescription,
  },
  {
    name: "report-guide",
    label: reportGuideToolCopy.title,
    description: reportGuideToolCopy.description,
    operation: defaultReportGuideOperation,
    prepareInput: (input) => resolveReportGuideRequest(input),
    examples: reportGuideSchemaCopy.requestExamples,
    limitations: reportGuideCliCopy.notes,
    resultSummary: reportGuideSchemaCopy.resultDescription,
  },
  {
    name: "view-report",
    label: viewReportToolCopy.title,
    description: viewReportToolCopy.description,
    operation: defaultViewReportOperation,
    prepareInput: (input) => resolveViewReportRequest(input),
    examples: viewReportSchemaCopy.requestExamples,
    limitations: viewReportCliCopy.notes,
    resultSummary: viewReportSchemaCopy.resultDescription,
  },
] as const satisfies readonly OperationDefinition[];

const isAbortSignalAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = <Key extends string>(
  record: Record<string, unknown>,
  key: Key,
): record is Record<Key, string> & Record<string, unknown> =>
  typeof record[key] === "string";

const createAbortError = (operationName?: string): DartyToolsetError =>
  new DartyToolsetError({
    code: "aborted",
    message: operationName
      ? `Darty operation was aborted: ${operationName}`
      : "Darty operation was aborted.",
    retryable: true,
    ...(operationName === undefined ? {} : { operationName }),
  });

const raceWithAbort = async <T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  operationName: string,
): Promise<T> => {
  if (signal === undefined) {
    return promise;
  }

  if (isAbortSignalAborted(signal)) {
    throw createAbortError(operationName);
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(createAbortError(operationName));

    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
};

const extractRequiredInputKeys = (inputJsonSchema: unknown): readonly string[] => {
  if (!isRecord(inputJsonSchema) || !Array.isArray(inputJsonSchema.required)) {
    return [];
  }

  return inputJsonSchema.required.filter(
    (key): key is string => typeof key === "string",
  );
};

const createCommandHelp = (
  definition: OperationDefinition,
): DartyOperationSpec => ({
  name: definition.name,
  label: definition.label,
  description: definition.description,
  inputJsonSchema: definition.operation.inputJsonSchema,
  resultJsonSchema: definition.operation.resultJsonSchema,
  requiredInputKeys: extractRequiredInputKeys(definition.operation.inputJsonSchema),
  examples: definition.examples ?? [],
  limitations: definition.limitations ?? [],
  resultSummary: definition.resultSummary ?? "Darty result envelope for this operation.",
});

const inspectToolHelpRecoveryAction = {
  kind: "inspect_tool_help",
} as const satisfies DartyValidationRecoveryAction;

const inspectCommandHelpRecoveryAction = (
  operationName: DartyOperationName,
): DartyValidationRecoveryAction => ({
  kind: "inspect_command_help",
  operationName,
});

const commandHelpRecoveryHint = (operationName: DartyOperationName): string =>
  `Inspect getCommandHelp("${operationName}") for the input schema and examples.`;

const createUnknownOperationValidationFailure = (
  name: string,
): DartyValidationFailure => ({
  code: "invalid_request",
  message: `Unknown Darty operation: ${name}`,
  operationName: name,
  parameter: "name",
  reason: "unknown_operation",
  expected: dartyOperationNames.join(","),
  actual: name,
  recoveryHint: "Use help() or listOperations() to choose a canonical Darty operation name.",
  recoverable: true,
  recoveryAction: inspectToolHelpRecoveryAction,
});

const createInvalidInputValidationFailure = (
  operationName: DartyOperationName,
  actual: unknown,
  exampleInput: Record<string, unknown> | undefined,
): DartyValidationFailure => ({
  code: "invalid_parameter",
  message: "Darty operation input must be an object.",
  operationName,
  parameter: "input",
  reason: "invalid_type",
  expected: "object",
  actual,
  recoveryHint: commandHelpRecoveryHint(operationName),
  recoverable: true,
  recoveryAction: inspectCommandHelpRecoveryAction(operationName),
  ...(exampleInput === undefined ? {} : { exampleInput }),
});

const toValidationFailure = (
  error: unknown,
  operationName: DartyOperationName,
  exampleInput: Record<string, unknown> | undefined,
): DartyValidationFailure => {
  if (isRecord(error)) {
    const code = hasString(error, "code")
      ? toValidationFailureCode(error.code)
      : "invalid_request";
    const parameter = hasString(error, "parameter") ? error.parameter : undefined;
    const reason = hasString(error, "reason") ? error.reason : undefined;
    const expected = hasString(error, "expected") ? error.expected : undefined;
    const recoveryHint = hasString(error, "recoveryHint")
      ? error.recoveryHint
      : parameter === undefined
        ? commandHelpRecoveryHint(operationName)
        : (getInvalidRequestRecoveryHint({
            code,
            parameter,
            ...(reason === undefined ? {} : { reason }),
            ...(expected === undefined ? {} : { expected }),
          }) ?? commandHelpRecoveryHint(operationName));

    return {
      code,
      message: hasString(error, "message")
        ? error.message
        : "Darty input validation failed.",
      operationName,
      ...(parameter === undefined ? {} : { parameter }),
      ...(reason === undefined ? {} : { reason }),
      ...(expected === undefined ? {} : { expected }),
      ...("actual" in error ? { actual: error.actual } : {}),
      recoveryHint,
      ...(exampleInput === undefined ? {} : { exampleInput }),
      recoverable: true,
      recoveryAction: inspectCommandHelpRecoveryAction(operationName),
    };
  }

  return {
    code: "invalid_request",
    message: "Darty input validation failed.",
    operationName,
    recoveryHint: commandHelpRecoveryHint(operationName),
    ...(exampleInput === undefined ? {} : { exampleInput }),
    recoverable: true,
    recoveryAction: inspectCommandHelpRecoveryAction(operationName),
  };
};

const toValidationFailureCode = (code: string): DartyValidationFailureCode => {
  switch (code) {
    case "missing_parameter":
    case "invalid_parameter":
    case "unknown_parameter":
      return code;
    default:
      return "invalid_request";
  }
};

const isDartyOperationName = (value: unknown): value is DartyOperationName =>
  typeof value === "string" &&
  (dartyOperationNames as readonly string[]).includes(value);

const isValidationRecoveryAction = (
  value: unknown,
): value is DartyValidationRecoveryAction =>
  isRecord(value) &&
  (value.kind === "inspect_tool_help" ||
    (value.kind === "inspect_command_help" &&
      isDartyOperationName(value.operationName)));

const copyKnownErrorFields = (
  record: Record<string, unknown>,
): Omit<DartySerializedError, "name" | "message"> => ({
  ...(typeof record.code === "string" ? { code: record.code } : {}),
  ...(typeof record.recoverable === "boolean"
    ? { recoverable: record.recoverable }
    : {}),
  ...(typeof record.retryable === "boolean" ? { retryable: record.retryable } : {}),
  ...(isValidationRecoveryAction(record.recoveryAction)
    ? { recoveryAction: record.recoveryAction }
    : {}),
  ...(typeof record.parameter === "string" ? { parameter: record.parameter } : {}),
  ...(typeof record.operationName === "string"
    ? { operationName: record.operationName }
    : {}),
  ...(typeof record.sourceUrl === "string" ? { sourceUrl: record.sourceUrl } : {}),
  ...(typeof record.recoveryHint === "string"
    ? { recoveryHint: record.recoveryHint }
    : {}),
  ...(typeof record.reason === "string" ? { reason: record.reason } : {}),
  ...(typeof record.expected === "string" ? { expected: record.expected } : {}),
  ...("actual" in record ? { actual: record.actual } : {}),
  ...(isRecord(record.exampleInput) ? { exampleInput: record.exampleInput } : {}),
});

export const serializeDartyError = (error: unknown): DartySerializedError => {
  if (error instanceof Error) {
    const record = error as Error & Record<string, unknown>;

    return {
      name: error.name,
      message: error.message,
      ...copyKnownErrorFields(record),
    };
  }

  if (isRecord(error)) {
    return {
      name: hasString(error, "name") ? error.name : "UnknownError",
      message: hasString(error, "message") ? error.message : String(error),
      ...copyKnownErrorFields(error),
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
};

export const createDartyToolset = (
  options: CreateDartyToolsetOptions = {},
): DartyToolset => {
  const definitions = options.operations ?? defaultOperationDefinitions;
  const operationByName = new Map(
    definitions.map((definition) => [definition.name, definition]),
  );
  const summaries = () =>
    definitions.map(({ name, label, description }) => ({
      name,
      label,
      description,
    }));
  const getCommandHelp = (name: string): DartyOperationSpec | undefined => {
    const definition = operationByName.get(name as DartyOperationName);

    return definition === undefined ? undefined : createCommandHelp(definition);
  };
  const validateInput = (
    name: string,
    input: unknown,
  ): DartyValidationResult => {
    const definition = operationByName.get(name as DartyOperationName);

    if (definition === undefined) {
      return { ok: false, error: createUnknownOperationValidationFailure(name) };
    }

    const [exampleInput] = definition.examples ?? [];

    try {
      if (definition.prepareInput !== undefined) {
        return { ok: true, input: definition.prepareInput(input) };
      }

      if (!isRecord(input)) {
        return {
          ok: false,
          error: createInvalidInputValidationFailure(
            definition.name,
            input,
            exampleInput,
          ),
        };
      }

      return { ok: true, input };
    } catch (error) {
      return {
        ok: false,
        error: toValidationFailure(error, definition.name, exampleInput),
      };
    }
  };

  return {
    id: "darty",
    label: "Darty",
    description:
      "Read-only Korean DART disclosure search and report-viewing operations with source references, warnings, and typed capability errors.",
    help: () => ({
      id: "darty",
      label: "Darty",
      description:
        "Read-only Korean DART disclosure search and report-viewing operations with source references, warnings, and typed capability errors.",
      usage:
        "Inspect operations with listOperations()/getCommandHelp(name), validate input with validateInput(name, input), then run execute(name, input).",
      operations: summaries(),
      limitations: sourceLimitations,
      citationGuidance,
    }),
    listOperations: summaries,
    getOperation: getCommandHelp,
    getCommandHelp,
    validateInput,
    serializeError: serializeDartyError,
    execute: async (name, input, context) => {
      const definition = operationByName.get(name as DartyOperationName);

      if (definition === undefined) {
        throw new DartyToolsetError({
          code: "unknown_operation",
          message: `Unknown Darty operation: ${name}`,
          retryable: false,
          operationName: name,
        });
      }

      if (isAbortSignalAborted(context?.signal)) {
        throw createAbortError(name);
      }

      const validation = validateInput(name, input);

      if (!validation.ok) {
        throw new DartyToolsetValidationError(validation.error);
      }

      return raceWithAbort(
        definition.operation.execute(validation.input, context),
        context?.signal,
        name,
      );
    },
  };
};
