import { ParseResult, Schema } from "effect";

import {
  reportViewFieldCopy,
  reportViewSchemaCopy,
  reportViewValidationCopy,
} from "../copy.ts";
import { InvalidReportViewRequest } from "./errors.ts";

const receiptNumberPattern = /^\d{14}$/;

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S =>
  (schema as S & { annotations: (annotations: Record<PropertyKey, unknown>) => S })
    .annotations(annotations);

const nonEmptyField = (description: string) =>
  annotateSchema(Schema.NonEmptyString, { description });

const defaultedField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
  readonly defaultValue: A;
}) =>
  annotateSchema(
    Schema.optionalWith(
      annotateSchema(spec.schema, { description: spec.description }),
      { default: () => spec.defaultValue },
    ),
    { default: spec.defaultValue },
  );

export const reportViewOutputFormatValues = ["html"] as const;
export type ReportViewOutputFormat =
  (typeof reportViewOutputFormatValues)[number];

const ReportViewOutputFormatSchema = Schema.Literal(
  ...reportViewOutputFormatValues,
);

const ReportViewMaxBytesSchema = Schema.Int.pipe(
  Schema.greaterThanOrEqualTo(1_000),
  Schema.lessThanOrEqualTo(1_000_000),
);

const reportViewRequestFields = {
  receipt: nonEmptyField(reportViewFieldCopy.receipt.description),
  documentId: Schema.optional(
    nonEmptyField(reportViewFieldCopy.documentId.description),
  ),
  sectionId: Schema.optional(
    nonEmptyField(reportViewFieldCopy.sectionId.description),
  ),
  outputFormat: defaultedField({
    schema: ReportViewOutputFormatSchema,
    description: reportViewFieldCopy.outputFormat.description,
    defaultValue: "html" as const,
  }),
  maxBytes: defaultedField({
    schema: ReportViewMaxBytesSchema,
    description: reportViewFieldCopy.maxBytes.description,
    defaultValue: 200_000,
  }),
} as const;

export const ReportViewRequestSchema = Schema.Struct(
  reportViewRequestFields,
).annotations({
  identifier: "ReportViewRequest",
  description: reportViewSchemaCopy.requestDescription,
});

export type ReportViewRawInput = typeof ReportViewRequestSchema.Encoded;
export type ReportViewRequest = typeof ReportViewRequestSchema.Type;

export const decodeReportViewRequest = Schema.decodeUnknownSync(
  ReportViewRequestSchema,
);

export const reportViewInputKeys = Object.keys(
  reportViewRequestFields,
) as readonly (keyof typeof reportViewRequestFields)[];

export const extractReceiptNumber = (receipt: string): string | undefined => {
  const trimmed = receipt.trim();

  if (receiptNumberPattern.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const rcpNo = url.searchParams.get("rcpNo");

    return rcpNo !== null && receiptNumberPattern.test(rcpNo)
      ? rcpNo
      : undefined;
  } catch {
    return undefined;
  }
};

const fieldExpected: Record<string, string> = {
  receipt: reportViewValidationCopy.expectedReceipt,
  documentId: reportViewValidationCopy.expectedNonEmptyString,
  sectionId: reportViewValidationCopy.expectedNonEmptyString,
  outputFormat: reportViewValidationCopy.expectedHtmlOutput,
  maxBytes: reportViewValidationCopy.expectedMaxBytes,
};

const collectIssuePath = (
  issue: ParseResult.ParseIssue,
): readonly PropertyKey[] => {
  if (issue._tag === "Pointer") {
    return Array.isArray(issue.path)
      ? issue.path
      : [issue.path as PropertyKey];
  }

  if (issue._tag === "Composite") {
    const nested = Array.isArray(issue.issues)
      ? issue.issues[0]
      : issue.issues;

    return nested === undefined ? [] : collectIssuePath(nested);
  }

  if (issue._tag === "Refinement" || issue._tag === "Transformation") {
    return collectIssuePath(issue.issue);
  }

  return [];
};

export const resolveReportViewRequest = (
  input: Partial<ReportViewRawInput> & Record<string, unknown>,
): ReportViewRequest => {
  const allowedKeys = new Set<string>(reportViewInputKeys);
  const unknownKey = Object.keys(input).find((key) => !allowedKeys.has(key));

  if (unknownKey !== undefined) {
    throw new InvalidReportViewRequest({
      code: "unknown_parameter",
      parameter: unknownKey,
      expected: reportViewInputKeys.join(","),
      actual: input[unknownKey],
      message: reportViewValidationCopy.unknownParameter(unknownKey),
    });
  }

  try {
    const request = decodeReportViewRequest(input);
    const receiptNumber = extractReceiptNumber(request.receipt);

    if (receiptNumber === undefined) {
      throw new InvalidReportViewRequest({
        code: "invalid_parameter",
        parameter: "receipt",
        expected: reportViewValidationCopy.expectedReceipt,
        actual: request.receipt,
        message: reportViewValidationCopy.invalidParameter(
          "receipt",
          reportViewValidationCopy.expectedReceipt,
        ),
      });
    }

    return request;
  } catch (error) {
    if (error instanceof InvalidReportViewRequest) {
      throw error;
    }

    if (error instanceof ParseResult.ParseError) {
      const [parameter] = collectIssuePath(error.issue);
      const parameterName = typeof parameter === "string" ? parameter : "input";
      const expected = fieldExpected[parameterName] ?? "valid_report_view_input";
      const actual = input[parameterName];
      const missing = actual === undefined;

      throw new InvalidReportViewRequest({
        code: missing ? "missing_parameter" : "invalid_parameter",
        parameter: parameterName,
        expected,
        actual,
        message: missing
          ? reportViewValidationCopy.missingRequired(parameterName, expected)
          : reportViewValidationCopy.invalidParameter(parameterName, expected),
      });
    }

    throw error;
  }
};
