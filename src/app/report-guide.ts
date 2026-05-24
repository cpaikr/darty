import type {
  ReportGuideRawInput,
  ReportGuideResult,
} from "../capabilities/report-guide/contract.ts";
import { executeReportGuide } from "../capabilities/report-guide/execute.ts";
import {
  reportGuideInputJsonSchema,
  reportGuideOperationName,
  reportGuideResultJsonSchema,
} from "../capabilities/report-guide/spec.ts";

export type ReportGuideOperation = {
  readonly name: typeof reportGuideOperationName;
  readonly inputJsonSchema: typeof reportGuideInputJsonSchema;
  readonly resultJsonSchema: typeof reportGuideResultJsonSchema;
  readonly execute: (
    input: Partial<ReportGuideRawInput> & Record<string, unknown>,
  ) => Promise<ReportGuideResult>;
};

export const defaultReportGuideOperation: ReportGuideOperation = {
  name: reportGuideOperationName,
  inputJsonSchema: reportGuideInputJsonSchema,
  resultJsonSchema: reportGuideResultJsonSchema,
  execute: executeReportGuide,
};
