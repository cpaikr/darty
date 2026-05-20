import { defaultCompanyDetailOperation } from "./app/company-detail.ts";
import { defaultCompanyRssOperation } from "./app/company-rss.ts";
import { defaultDisclosureTypesOperation } from "./app/disclosure-types.ts";
import { defaultSearchBodyOperation } from "./app/search-body.ts";
import { defaultSearchCompanyOperation } from "./app/search-company.ts";
import { defaultSearchCompanyReportsOperation } from "./app/search-company-reports.ts";
import { defaultViewReportOperation } from "./app/view-report.ts";
import { companyDetailToolCopy } from "./capabilities/company-detail/copy.ts";
import { companyRssToolCopy } from "./capabilities/company-rss/copy.ts";
import { disclosureTypesToolCopy } from "./capabilities/disclosure-types/copy.ts";
import { searchBodyToolCopy } from "./capabilities/search-body/copy.ts";
import { searchCompanyReportsToolCopy } from "./capabilities/search-company-reports/copy.ts";
import { searchCompanyToolCopy } from "./capabilities/search-company/copy.ts";
import { viewReportToolCopy } from "./capabilities/view-report/copy.ts";

export const dartyOperationNames = [
  "search-body",
  "search-company",
  "search-company-reports",
  "company-detail",
  "company-rss",
  "disclosure-types",
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
};

export type DartyToolRunResult = unknown;

export type DartyToolset = {
  readonly id: "darty";
  readonly label: string;
  readonly description: string;
  readonly listOperations: () => readonly DartyOperationSummary[];
  readonly getOperation: (name: string) => DartyOperationSpec | undefined;
  readonly execute: (
    name: string,
    input: Record<string, unknown>,
    context?: DartyToolRunContext,
  ) => Promise<DartyToolRunResult>;
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

type AppOperation = {
  readonly name: DartyOperationName;
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type OperationDefinition = DartyOperationSummary & {
  readonly operation: AppOperation;
};

export type CreateDartyToolsetOptions = {
  /**
   * Override operations for tests or custom hosts. Most callers should use the
   * default DART-backed operations by calling createDartyToolset() with no args.
   */
  readonly operations?: readonly OperationDefinition[];
};

const defaultOperationDefinitions = [
  {
    name: "search-body",
    label: searchBodyToolCopy.title,
    description: searchBodyToolCopy.description,
    operation: defaultSearchBodyOperation,
  },
  {
    name: "search-company",
    label: searchCompanyToolCopy.title,
    description: searchCompanyToolCopy.description,
    operation: defaultSearchCompanyOperation,
  },
  {
    name: "search-company-reports",
    label: searchCompanyReportsToolCopy.title,
    description: searchCompanyReportsToolCopy.description,
    operation: defaultSearchCompanyReportsOperation,
  },
  {
    name: "company-detail",
    label: companyDetailToolCopy.title,
    description: companyDetailToolCopy.description,
    operation: defaultCompanyDetailOperation,
  },
  {
    name: "company-rss",
    label: companyRssToolCopy.title,
    description: companyRssToolCopy.description,
    operation: defaultCompanyRssOperation,
  },
  {
    name: "disclosure-types",
    label: disclosureTypesToolCopy.title,
    description: disclosureTypesToolCopy.description,
    operation: defaultDisclosureTypesOperation,
  },
  {
    name: "view-report",
    label: viewReportToolCopy.title,
    description: viewReportToolCopy.description,
    operation: defaultViewReportOperation,
  },
] as const satisfies readonly OperationDefinition[];

const isAbortSignalAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

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

export const createDartyToolset = (
  options: CreateDartyToolsetOptions = {},
): DartyToolset => {
  const definitions = options.operations ?? defaultOperationDefinitions;
  const operationByName = new Map(
    definitions.map((definition) => [definition.name, definition]),
  );

  return {
    id: "darty",
    label: "Darty",
    description:
      "Read-only Korean DART disclosure search and report-viewing operations with source references, warnings, and typed capability errors.",
    listOperations: () =>
      definitions.map(({ name, label, description }) => ({
        name,
        label,
        description,
      })),
    getOperation: (name) => {
      const definition = operationByName.get(name as DartyOperationName);

      if (definition === undefined) {
        return undefined;
      }

      return {
        name: definition.name,
        label: definition.label,
        description: definition.description,
        inputJsonSchema: definition.operation.inputJsonSchema,
        resultJsonSchema: definition.operation.resultJsonSchema,
      };
    },
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

      return raceWithAbort(definition.operation.execute(input), context?.signal, name);
    },
  };
};
