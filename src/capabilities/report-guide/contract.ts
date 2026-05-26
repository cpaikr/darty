import { Schema } from "effect";

import { assertNoUnknownKeys, assertObjectInput } from "../request-validation.ts";
import { describedString } from "../schema-annotations.ts";
import { reportGuideSchemaCopy, reportGuideValidationCopy } from "./copy.ts";

export type ReportGuideFailureCode = "invalid_request" | "internal_error";

export class InvalidReportGuideRequest extends Error {
  override readonly name = "InvalidReportGuideRequest";
  readonly code: "invalid_parameter" | "unknown_parameter";
  readonly parameter: string;
  readonly reason: string;
  readonly expected: string | undefined;
  readonly actual: unknown;

  constructor(input: {
    readonly code: "invalid_parameter" | "unknown_parameter";
    readonly parameter: string;
    readonly reason: string;
    readonly message: string;
    readonly expected?: string;
    readonly actual?: unknown;
  }) {
    super(input.message);
    this.code = input.code;
    this.parameter = input.parameter;
    this.reason = input.reason;
    this.expected = input.expected;
    this.actual = input.actual;
  }
}

export class ReportGuideFailure extends Error {
  override readonly name = "ReportGuideFailure";
  readonly code: ReportGuideFailureCode;
  readonly retryable: boolean;
  readonly parameter: string | undefined;
  readonly recoveryHint: string | undefined;

  constructor(input: {
    readonly code: ReportGuideFailureCode;
    readonly message: string;
    readonly retryable: boolean;
    readonly parameter?: string;
    readonly recoveryHint?: string;
  }) {
    super(input.message);
    this.code = input.code;
    this.retryable = input.retryable;
    this.parameter = input.parameter;
    this.recoveryHint = input.recoveryHint;
  }
}

export const ReportGuideRequestSchema = Schema.Struct({}).annotations({
  identifier: "ReportGuideRequest",
  description: reportGuideSchemaCopy.requestDescription,
  examples: reportGuideSchemaCopy.requestExamples,
});

export type ReportGuideRawInput = typeof ReportGuideRequestSchema.Encoded;
export type ReportGuideRequest = typeof ReportGuideRequestSchema.Type;

export const resolveReportGuideRequest = (input: unknown): ReportGuideRequest => {
  assertObjectInput(
    input,
    (actual) =>
      new InvalidReportGuideRequest({
        code: "invalid_parameter",
        parameter: "input",
        reason: "invalid_type",
        expected: reportGuideValidationCopy.inputExpected,
        actual,
        message: reportGuideValidationCopy.inputMustBeObject,
      }),
  );

  assertNoUnknownKeys(
    input,
    new Set<string>(),
    (key, actual) =>
      new InvalidReportGuideRequest({
        code: "unknown_parameter",
        parameter: key,
        reason: "unknown_parameter",
        actual,
        message: reportGuideValidationCopy.unknownParameter(key),
      }),
  );

  return {};
};

export const ReportGuideMetadataSchema = Schema.Struct({
  source: Schema.Struct({
    status: Schema.Literal("bundled_project_document"),
    path: describedString("Source guide path bundled in the package."),
  }),
});
export type ReportGuideMetadata = typeof ReportGuideMetadataSchema.Type;

export const ReportGuideReferencesSchema = Schema.Struct({
  guidePath: describedString("Guide path inside the repository."),
  sourceUrls: Schema.Array(describedString("DART public filing guide URL used to write the guide.")),
});
export type ReportGuideReferences = typeof ReportGuideReferencesSchema.Type;

export const ReportGuideWarningSchema = Schema.Struct({
  code: describedString("Warning code."),
  message: describedString("Warning explanation."),
});
export type ReportGuideWarning = typeof ReportGuideWarningSchema.Type;

export const ReportGuideResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: ReportGuideRequestSchema,
    title: describedString("Guide title."),
    contentMarkdown: describedString("Markdown body of the DART report information guide."),
  }),
  metadata: ReportGuideMetadataSchema,
  references: ReportGuideReferencesSchema,
  warnings: Schema.Array(ReportGuideWarningSchema),
}).annotations({
  identifier: "ReportGuideResult",
  description: reportGuideSchemaCopy.resultDescription,
});
export type ReportGuideResult = typeof ReportGuideResultSchema.Type;
