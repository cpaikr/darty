import type {
  ReportViewRawInput,
  ReportViewResult,
} from "../capabilities/report-view/contract.ts";
import { executeReportView } from "../capabilities/report-view/execute.ts";
import type { ReportViewProvider } from "../capabilities/report-view/provider.ts";
import {
  reportViewInputJsonSchema,
  reportViewOperationName,
  reportViewResultJsonSchema,
} from "../capabilities/report-view/spec.ts";
import { dsaf001ReportViewProvider } from "../sources/dart/dsaf001/report/view.ts";

export type ReportViewOperation = {
  readonly name: typeof reportViewOperationName;
  readonly inputJsonSchema: typeof reportViewInputJsonSchema;
  readonly resultJsonSchema: typeof reportViewResultJsonSchema;
  readonly execute: (
    input: Partial<ReportViewRawInput> & Record<string, unknown>,
  ) => Promise<ReportViewResult>;
};

export const createReportViewOperation = (
  provider: ReportViewProvider,
): ReportViewOperation => ({
  name: reportViewOperationName,
  inputJsonSchema: reportViewInputJsonSchema,
  resultJsonSchema: reportViewResultJsonSchema,
  execute: (input) => executeReportView(input, provider),
});

export const defaultReportViewOperation = createReportViewOperation(
  dsaf001ReportViewProvider,
);
