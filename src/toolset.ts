import { defaultCompanyDetailOperation } from "./app/company-detail.ts";
import { defaultCompanyRssOperation } from "./app/company-rss.ts";
import { defaultDisclosureTypesOperation } from "./app/disclosure-types.ts";
import { defaultReportGuideOperation } from "./app/report-guide.ts";
import { defaultSearchBodyOperation } from "./app/search-body.ts";
import { defaultSearchCompanyOperation } from "./app/search-company.ts";
import { defaultSearchCompanyReportsOperation } from "./app/search-company-reports.ts";
import { defaultViewReportOperation } from "./app/view-report.ts";
import {
  sanitizeErrorDiagnostics,
  type DartyErrorDiagnostics,
} from "./error-diagnostics.ts";
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
import { getInvalidRequestRecoveryHint } from "./capabilities/recovery-hints.ts";
import {
  reportGuideCliCopy,
  reportGuideSchemaCopy,
  reportGuideToolCopy,
} from "./capabilities/report-guide/copy.ts";
import { resolveReportGuideRequest } from "./capabilities/report-guide/contract.ts";
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

export const dartySingleToolActions = [
  "help",
  "command_help",
  "validate",
  "run",
] as const;

export type DartySingleToolAction = (typeof dartySingleToolActions)[number];

export type DartySingleToolRunAction = Extract<
  DartySingleToolAction,
  "validate" | "run"
>;

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
  | {
      readonly kind: "inspect_command_help";
      readonly operationName: DartyOperationName;
    }
  | {
      readonly kind: "inspect_tool_help";
    };

type DartyValidationFailureBase = {
  readonly code: DartyValidationFailureCode;
  readonly message: string;
  readonly operationName?: string;
  readonly parameter?: string;
  readonly reason?: string;
  readonly expected?: string;
  readonly actual?: unknown;
  readonly recoveryHint?: string;
  readonly exampleInput?: Record<string, unknown>;
};

export type DartyValidationFailure = DartyValidationFailureBase &
  (
    | {
        readonly retryable: true;
        readonly recoveryAction: DartyValidationRecoveryAction;
      }
    | {
        readonly retryable: false;
        readonly recoveryAction?: never;
      }
  );

export type DartyValidationResult =
  | { readonly ok: true; readonly input: Record<string, unknown> }
  | { readonly ok: false; readonly error: DartyValidationFailure };

export type DartySerializedError = {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly parameter?: string;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;
  readonly operationName?: string;
  readonly diagnostics?: DartyErrorDiagnostics;
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

export type DartySingleToolCopy = {
  readonly description: string;
  readonly promptSnippet: string;
  readonly promptGuidelines: readonly string[];
  readonly parameterDescriptions: {
    readonly action: string;
    readonly command: string;
    readonly inputJson: string;
  };
  readonly actionSummaries: Record<DartySingleToolAction, string>;
};

export type DartyToolsetErrorCode = "unknown_operation" | "aborted";

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

export const createDartyUnknownOperationError = (
  operationName: string,
): DartyToolsetError =>
  new DartyToolsetError({
    code: "unknown_operation",
    message: `Unknown Darty operation: ${operationName}`,
    retryable: false,
    operationName,
  });

type AppOperation = {
  readonly name: DartyOperationName;
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly execute: (input: Record<string, unknown>) => Promise<unknown>;
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
  "Darty reads public DART web pages and static DART code material in read-only mode. It is not the official OpenDART API.",
  "DART web behavior can change; verify important results with the returned source references.",
  "Darty does not provide investment, accounting, or legal judgment.",
] as const;

const citationGuidance = [
  "When presenting results, cite result.references, result.metadata, warnings, and original DART viewer/source URLs.",
  "When context matters, use search operations to find candidates, then inspect the actual filing body or section with view-report.",
] as const;

export const dartySingleToolCopy = {
  description:
    "Read-only tool for searching Korean DART disclosures and retrieving report bodies with source references, warnings, and metadata.",
  promptSnippet:
    "Use darty(action, command?, inputJson?) when you need Korean DART disclosure search, company lookup, company filing lists, disclosure type lookup, RSS, report body retrieval, or a report information guide.",
  promptGuidelines: [
    "Do not guess command names; first call action=help to inspect available DART commands.",
    "Use action=command_help when required inputs, accepted values, examples, or result shape are unclear; do not infer input key names from prose.",
    "Use action=validate to repair or normalize input without a live DART request.",
    "After constructing command input, use action=run. Darty validates before execution and returns references, warnings, metadata, and original URLs needed for citation.",
  ],
  parameterDescriptions: {
    action: "Darty tool action. Must be one of help, command_help, validate, or run.",
    command: "Canonical Darty command name, such as search-company or view-report.",
    inputJson: "Command input object matching the selected Darty command's JSON contract.",
  },
  actionSummaries: {
    help: "Inspect tool-level help and the command menu.",
    command_help: "Inspect one command's schema, examples, limitations, and result summary.",
    validate: "Validate and normalize one command input without a live DART request.",
    run: "Validate input, then execute one command.",
  },
} as const satisfies DartySingleToolCopy;

const json = (value: unknown): string => JSON.stringify(value, null, 2);

const bulletList = (items: readonly string[]): string =>
  items.length === 0 ? "- None." : items.map((item) => `- ${item}`).join("\n");

export const formatDartyToolsetHelp = (help: DartyToolsetHelp): string => {
  const operations = help.operations.map(
    (operation) => `- ${operation.name}: ${operation.description}`,
  );

  return [
    `${help.label}: ${help.description}`,
    "",
    "Usage: darty(action, command?, inputJson?)",
    "Actions:",
    ...dartySingleToolActions.map(
      (action) => `- ${action}: ${dartySingleToolCopy.actionSummaries[action]}`,
    ),
    "",
    "Commands:",
    ...operations,
    "",
    "Limitations:",
    bulletList(help.limitations),
    "",
    "Citation guidance:",
    bulletList(help.citationGuidance),
  ].join("\n");
};

export const formatDartyCommandHelp = (commandHelp: DartyCommandHelp): string =>
  [
    `Darty command ${commandHelp.name}: ${commandHelp.description}`,
    `Required input keys: ${commandHelp.requiredInputKeys.join(", ") || "none"}`,
    "",
    "Input JSON Schema:",
    json(commandHelp.inputJsonSchema),
    "",
    "Examples:",
    json(commandHelp.examples),
    "",
    "Limitations:",
    bulletList(commandHelp.limitations),
    "",
    "Result summary:",
    commandHelp.resultSummary,
  ].join("\n");

export const formatDartyValidationSuccess = (
  command: string,
  validation: Extract<DartyValidationResult, { ok: true }>,
): string =>
  [
    `Darty ${command} input validation succeeded.`,
    "Normalized input:",
    json(validation.input),
  ].join("\n");

export const formatDartyValidationFailure = (
  action: DartySingleToolRunAction,
  command: string,
  error: DartyValidationFailure,
): string =>
  [
    `Darty ${action} input validation failed for ${command}.`,
    "Repair details:",
    json(error),
  ].join("\n");

export const formatDartyRunSuccess = (command: string, result: unknown): string =>
  [
    `Darty ${command} run succeeded.`,
    "Use returned references, warnings, metadata, and original URLs for citation and follow-up commands.",
    "Result envelope:",
    json(result),
  ].join("\n");

export const formatDartyRunFailure = (
  command: string,
  error: DartySerializedError,
): string =>
  [`Darty ${command} run failed.`, "Error:", json(error)].join("\n");

export const formatDartyInvalidToolInput = (
  error: DartyValidationFailure,
): string => `Invalid Darty tool input.\n${json(error)}`;

export const formatDartyUnknownCommand = (
  command: string,
  error: DartySerializedError,
): string => `Unknown Darty command: ${command}\n${json(error)}`;

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

const isDartyOperationName = (value: unknown): value is DartyOperationName =>
  typeof value === "string" &&
  dartyOperationNames.includes(value as DartyOperationName);

const recoveryActionForCommandInput = (
  command: string,
): DartyValidationRecoveryAction =>
  isDartyOperationName(command)
    ? inspectCommandHelpRecoveryAction(command)
    : inspectToolHelpRecoveryAction;

const createSingleToolValidationFailure = (input: {
  code: DartyValidationFailure["code"];
  message: string;
  parameter: string;
  reason: string;
  expected?: string;
  actual?: unknown;
  command?: string;
  recoveryHint?: string;
  recoveryAction: DartyValidationRecoveryAction;
}): DartyValidationFailure => ({
  code: input.code,
  message: input.message,
  ...(input.command === undefined ? {} : { operationName: input.command }),
  parameter: input.parameter,
  reason: input.reason,
  ...(input.expected === undefined ? {} : { expected: input.expected }),
  ...("actual" in input ? { actual: input.actual } : {}),
  ...(input.recoveryHint === undefined ? {} : { recoveryHint: input.recoveryHint }),
  retryable: true,
  recoveryAction: input.recoveryAction,
});

export const createDartySingleToolActionFailure = (
  actual: unknown,
): DartyValidationFailure =>
  createSingleToolValidationFailure({
    code: "invalid_parameter",
    message: "Darty action must be one of help, command_help, validate, or run.",
    parameter: "action",
    reason: !isRecord(actual) ? "invalid_type" : "invalid_enum",
    expected: dartySingleToolActions.join(","),
    actual: isRecord(actual) ? actual.action : actual,
    recoveryHint: "Call darty with action=help to inspect the command menu.",
    recoveryAction: inspectToolHelpRecoveryAction,
  });

export const createDartySingleToolCommandFailure = (
  action: DartySingleToolAction,
  command: unknown,
): DartyValidationFailure =>
  createSingleToolValidationFailure({
    code: command === undefined ? "missing_parameter" : "invalid_parameter",
    message: `Darty action ${action} requires command with a canonical operation name.`,
    parameter: "command",
    reason: command === undefined ? "required" : "invalid_type",
    expected: dartyOperationNames.join(","),
    actual: command,
    recoveryHint: "Call darty with action=help to inspect canonical command names.",
    recoveryAction: inspectToolHelpRecoveryAction,
  });

export const createDartySingleToolInputJsonFailure = (
  action: DartySingleToolRunAction,
  command: string,
  inputJson: unknown,
): DartyValidationFailure =>
  createSingleToolValidationFailure({
    code: inputJson === undefined ? "missing_parameter" : "invalid_parameter",
    message: `Darty action ${action} requires inputJson as an object.`,
    parameter: "inputJson",
    reason: inputJson === undefined ? "required" : "invalid_type",
    expected: "object",
    actual: inputJson,
    command,
    recoveryHint:
      "Call darty with action=command_help to inspect the command input schema and examples.",
    recoveryAction: recoveryActionForCommandInput(command),
  });

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
  recoveryHint: "Inspect canonical Darty operation names with help() or listOperations().",
  retryable: true,
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
  retryable: true,
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
        ? undefined
        : getInvalidRequestRecoveryHint({
            code,
            parameter,
            ...(reason === undefined ? {} : { reason }),
            ...(expected === undefined ? {} : { expected }),
          });

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
      ...(recoveryHint === undefined ? {} : { recoveryHint }),
      ...(exampleInput === undefined ? {} : { exampleInput }),
      retryable: true,
      recoveryAction: inspectCommandHelpRecoveryAction(operationName),
    };
  }

  return {
    code: "invalid_request",
    message: "Darty input validation failed.",
    operationName,
    ...(exampleInput === undefined ? {} : { exampleInput }),
    retryable: true,
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

const copyKnownErrorFields = (
  record: Record<string, unknown>,
): Omit<DartySerializedError, "name" | "message"> => {
  const diagnostics = sanitizeErrorDiagnostics(record.diagnostics);

  return {
    ...(typeof record.code === "string" ? { code: record.code } : {}),
    ...(typeof record.retryable === "boolean" ? { retryable: record.retryable } : {}),
    ...(typeof record.parameter === "string" ? { parameter: record.parameter } : {}),
    ...(typeof record.operationName === "string"
      ? { operationName: record.operationName }
      : {}),
    ...(typeof record.sourceUrl === "string" ? { sourceUrl: record.sourceUrl } : {}),
    ...(typeof record.recoveryHint === "string"
      ? { recoveryHint: record.recoveryHint }
      : {}),
    ...(diagnostics === undefined ? {} : { diagnostics }),
  };
};

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

  return {
    id: "darty",
    label: "DART search",
    description:
      "Read-only operations for Korean DART disclosure search and report body retrieval, preserving source references, warnings, and typed capability errors.",
    help: () => ({
      id: "darty",
      label: "DART search",
      description:
        "Read-only operations for Korean DART disclosure search and report body retrieval, preserving source references, warnings, and typed capability errors.",
      usage:
        "Discover operations with listOperations()/getCommandHelp(name), validate input with validateInput(name, input), then execute with execute(name, input).",
      operations: summaries(),
      limitations: sourceLimitations,
      citationGuidance,
    }),
    listOperations: summaries,
    getOperation: getCommandHelp,
    getCommandHelp,
    validateInput: (name, input) => {
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
    },
    serializeError: serializeDartyError,
    execute: async (name, input, context) => {
      const definition = operationByName.get(name as DartyOperationName);

      if (definition === undefined) {
        throw createDartyUnknownOperationError(name);
      }

      if (isAbortSignalAborted(context?.signal)) {
        throw createAbortError(name);
      }

      return raceWithAbort(definition.operation.execute(input), context?.signal, name);
    },
  };
};
