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
    message: `알 수 없는 Darty 작업입니다: ${operationName}`,
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
  "Darty는 DART 공개 웹 페이지와 정적 DART 코드 자료를 읽기 전용으로 조회합니다. 공식 OpenDART API가 아닙니다.",
  "DART 웹 동작은 변경될 수 있으므로 중요한 결과는 반환된 출처 참조로 확인하세요.",
  "Darty는 투자, 회계, 법률 판단을 제공하지 않습니다.",
] as const;

const citationGuidance = [
  "결과를 제시할 때 result.references, result.metadata, warnings, 원본 DART viewer/source URL을 인용 근거로 사용하세요.",
  "맥락 판단이 필요한 경우 검색 명령으로 후보를 찾은 뒤 view-report로 실제 공시 본문 또는 섹션을 확인하세요.",
] as const;

export const dartySingleToolCopy = {
  description:
    "한국 DART 공시를 검색하고 보고서 본문을 조회하는 읽기 전용 도구입니다. 출처, 경고, 메타데이터를 함께 반환합니다.",
  promptSnippet:
    "한국 DART 공시 검색, 회사 조회, 공시 목록, 공시유형 조회, RSS, 보고서 본문 조회, 보고서별 정보 안내가 필요하면 darty(action, command?, inputJson?)를 사용하세요.",
  promptGuidelines: [
    "명령 이름을 추측하지 말고 먼저 action=help로 사용할 수 있는 DART 명령을 확인하세요.",
    "필수 입력값, 허용값, 예시, 결과 형태가 불명확하면 action=command_help를 사용하세요.",
    "실시간 DART 조회 없이 입력을 고치거나 정규화하려면 action=validate를 사용하세요.",
    "명령 입력을 만든 뒤 action=run을 사용하세요. Darty는 실행 전 검증을 거치고 인용에 필요한 references, warnings, metadata, 원본 URL을 반환합니다.",
  ],
  parameterDescriptions: {
    action: "Darty 도구 동작입니다. help, command_help, validate, run 중 하나입니다.",
    command: "search-company, view-report 같은 표준 Darty 명령 이름입니다.",
    inputJson: "선택한 Darty 명령의 JSON 입력 계약을 따르는 명령 입력 객체입니다.",
  },
  actionSummaries: {
    help: "출처 수준 도움말과 명령 메뉴를 확인합니다.",
    command_help: "한 명령의 스키마, 예시, 제한사항, 결과 요약을 확인합니다.",
    validate: "실시간 DART 조회 없이 한 명령 입력을 검증하고 정규화합니다.",
    run: "입력을 검증한 뒤 한 명령을 실행합니다.",
  },
} as const satisfies DartySingleToolCopy;

const json = (value: unknown): string => JSON.stringify(value, null, 2);

const bulletList = (items: readonly string[]): string =>
  items.length === 0 ? "- 없음." : items.map((item) => `- ${item}`).join("\n");

export const formatDartyToolsetHelp = (help: DartyToolsetHelp): string => {
  const operations = help.operations.map(
    (operation) => `- ${operation.name}: ${operation.description}`,
  );

  return [
    `${help.label}: ${help.description}`,
    "",
    "사용 형식: darty(action, command?, inputJson?)",
    "동작:",
    ...dartySingleToolActions.map(
      (action) => `- ${action}: ${dartySingleToolCopy.actionSummaries[action]}`,
    ),
    "",
    "명령:",
    ...operations,
    "",
    "제한사항:",
    bulletList(help.limitations),
    "",
    "인용 지침:",
    bulletList(help.citationGuidance),
  ].join("\n");
};

export const formatDartyCommandHelp = (commandHelp: DartyCommandHelp): string =>
  [
    `Darty 명령 ${commandHelp.name}: ${commandHelp.description}`,
    `필수 입력 키: ${commandHelp.requiredInputKeys.join(", ") || "없음"}`,
    "",
    "입력 JSON Schema:",
    json(commandHelp.inputJsonSchema),
    "",
    "예시:",
    json(commandHelp.examples),
    "",
    "제한사항:",
    bulletList(commandHelp.limitations),
    "",
    "결과 요약:",
    commandHelp.resultSummary,
  ].join("\n");

export const formatDartyValidationSuccess = (
  command: string,
  validation: Extract<DartyValidationResult, { ok: true }>,
): string =>
  [
    `Darty ${command} 입력 검증이 성공했습니다.`,
    "정규화된 입력:",
    json(validation.input),
  ].join("\n");

export const formatDartyValidationFailure = (
  action: DartySingleToolRunAction,
  command: string,
  error: DartyValidationFailure,
): string =>
  [
    `Darty ${action} 입력 검증이 ${command}에서 실패했습니다.`,
    "수정 참고 정보:",
    json(error),
  ].join("\n");

export const formatDartyRunSuccess = (command: string, result: unknown): string =>
  [
    `Darty ${command} 실행이 성공했습니다.`,
    "인용과 후속 명령에는 반환된 references, warnings, metadata, 원본 URL을 사용하세요.",
    "결과 envelope:",
    json(result),
  ].join("\n");

export const formatDartyRunFailure = (
  command: string,
  error: DartySerializedError,
): string =>
  [`Darty ${command} 실행이 실패했습니다.`, "오류:", json(error)].join("\n");

export const formatDartyInvalidToolInput = (
  error: DartyValidationFailure,
): string => `Darty 도구 입력이 올바르지 않습니다.\n${json(error)}`;

export const formatDartyUnknownCommand = (
  command: string,
  error: DartySerializedError,
): string => `알 수 없는 Darty 명령입니다: ${command}\n${json(error)}`;

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
      ? `Darty 작업이 중단되었습니다: ${operationName}`
      : "Darty 작업이 중단되었습니다.",
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
  resultSummary: definition.resultSummary ?? "이 작업의 Darty 결과 envelope입니다.",
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
    message: "Darty action은 help, command_help, validate, run 중 하나여야 합니다.",
    parameter: "action",
    reason: !isRecord(actual) ? "invalid_type" : "invalid_enum",
    expected: dartySingleToolActions.join(","),
    actual: isRecord(actual) ? actual.action : actual,
    recoveryHint: "명령 메뉴를 보려면 action=help로 darty를 호출하세요.",
    recoveryAction: inspectToolHelpRecoveryAction,
  });

export const createDartySingleToolCommandFailure = (
  action: DartySingleToolAction,
  command: unknown,
): DartyValidationFailure =>
  createSingleToolValidationFailure({
    code: command === undefined ? "missing_parameter" : "invalid_parameter",
    message: `Darty action ${action}에는 표준 작업 이름인 command가 필요합니다.`,
    parameter: "command",
    reason: command === undefined ? "required" : "invalid_type",
    expected: dartyOperationNames.join(","),
    actual: command,
    recoveryHint: "표준 명령 이름을 보려면 action=help로 darty를 호출하세요.",
    recoveryAction: inspectToolHelpRecoveryAction,
  });

export const createDartySingleToolInputJsonFailure = (
  action: DartySingleToolRunAction,
  command: string,
  inputJson: unknown,
): DartyValidationFailure =>
  createSingleToolValidationFailure({
    code: inputJson === undefined ? "missing_parameter" : "invalid_parameter",
    message: `Darty action ${action}에는 객체 형태의 inputJson이 필요합니다.`,
    parameter: "inputJson",
    reason: inputJson === undefined ? "required" : "invalid_type",
    expected: "object",
    actual: inputJson,
    command,
    recoveryHint:
      "명령의 입력 스키마와 예시를 보려면 action=command_help로 darty를 호출하세요.",
    recoveryAction: recoveryActionForCommandInput(command),
  });

const createUnknownOperationValidationFailure = (
  name: string,
): DartyValidationFailure => ({
  code: "invalid_request",
  message: `알 수 없는 Darty 작업입니다: ${name}`,
  operationName: name,
  parameter: "name",
  reason: "unknown_operation",
  expected: dartyOperationNames.join(","),
  actual: name,
  recoveryHint: "표준 Darty 작업 이름은 help() 또는 listOperations()로 확인하세요.",
  retryable: true,
  recoveryAction: inspectToolHelpRecoveryAction,
});

const createInvalidInputValidationFailure = (
  operationName: DartyOperationName,
  actual: unknown,
  exampleInput: Record<string, unknown> | undefined,
): DartyValidationFailure => ({
  code: "invalid_parameter",
  message: "Darty 작업 입력은 객체여야 합니다.",
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
        : "Darty 입력 검증이 실패했습니다.",
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
    message: "Darty 입력 검증이 실패했습니다.",
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
): Omit<DartySerializedError, "name" | "message"> => ({
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

  return {
    id: "darty",
    label: "Dart 검색",
    description:
      "한국 DART 공시 검색과 보고서 본문 조회를 위한 읽기 전용 작업입니다. 출처, 경고, 타입화된 기능 오류를 보존합니다.",
    help: () => ({
      id: "darty",
      label: "Dart 검색",
      description:
        "한국 DART 공시 검색과 보고서 본문 조회를 위한 읽기 전용 작업입니다. 출처, 경고, 타입화된 기능 오류를 보존합니다.",
      usage:
        "작업은 listOperations()/getCommandHelp(name)으로 확인하고, validateInput(name, input)으로 입력을 검증한 뒤 execute(name, input)으로 실행하세요.",
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
