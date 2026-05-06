import type {
  ViewReportRawInput,
  ViewReportResult,
} from "../capabilities/view-report/contract.ts";
import { executeViewReport } from "../capabilities/view-report/execute.ts";
import type { ViewReportProvider } from "../capabilities/view-report/provider.ts";
import {
  viewReportInputJsonSchema,
  viewReportOperationName,
  viewReportResultJsonSchema,
} from "../capabilities/view-report/spec.ts";
import { dsaf001ViewReportProvider } from "../sources/dart/dsaf001/report/view.ts";

export type ViewReportOperation = {
  readonly name: typeof viewReportOperationName;
  readonly inputJsonSchema: typeof viewReportInputJsonSchema;
  readonly resultJsonSchema: typeof viewReportResultJsonSchema;
  readonly execute: (
    input: Partial<ViewReportRawInput> & Record<string, unknown>,
  ) => Promise<ViewReportResult>;
};

export const createViewReportOperation = (
  provider: ViewReportProvider,
): ViewReportOperation => ({
  name: viewReportOperationName,
  inputJsonSchema: viewReportInputJsonSchema,
  resultJsonSchema: viewReportResultJsonSchema,
  execute: (input) => executeViewReport(input, provider),
});

export const defaultViewReportOperation = createViewReportOperation(
  dsaf001ViewReportProvider,
);
