import { capabilitySchemaToJsonSchema } from "../types.ts";
import { reportGuideSchemaCopy } from "./copy.ts";
import { ReportGuideResultSchema } from "./contract.ts";

export const reportGuideOperationName = "report-guide";

export const reportGuideInputJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  description: reportGuideSchemaCopy.requestDescription,
  examples: reportGuideSchemaCopy.requestExamples,
} as const;

export const reportGuideResultJsonSchema = capabilitySchemaToJsonSchema(
  ReportGuideResultSchema,
);
