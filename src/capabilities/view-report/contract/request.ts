import { ParseResult, Schema } from "effect";

import {
  viewReportFieldCopy,
  viewReportSchemaCopy,
  viewReportValidationCopy,
} from "../copy.ts";
import { InvalidViewReportRequest } from "./errors.ts";

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

export const viewReportOutputFormatValues = ["html", "markdown"] as const;
export type ViewReportOutputFormat =
  (typeof viewReportOutputFormatValues)[number];

export const ViewReportOutputFormatSchema = Schema.Literal(
  ...viewReportOutputFormatValues,
);

const ViewReportMaxBytesSchema = Schema.Int.pipe(
  Schema.greaterThanOrEqualTo(1_000),
  Schema.lessThanOrEqualTo(1_000_000),
);

const viewReportRequestFields = {
  receipt: nonEmptyField(viewReportFieldCopy.receipt.description),
  documentId: Schema.optional(
    nonEmptyField(viewReportFieldCopy.documentId.description),
  ),
  sectionId: Schema.optional(
    nonEmptyField(viewReportFieldCopy.sectionId.description),
  ),
  outputFormat: defaultedField({
    schema: ViewReportOutputFormatSchema,
    description: viewReportFieldCopy.outputFormat.description,
    defaultValue: "markdown" as const,
  }),
  maxBytes: defaultedField({
    schema: ViewReportMaxBytesSchema,
    description: viewReportFieldCopy.maxBytes.description,
    defaultValue: 200_000,
  }),
} as const;

export const ViewReportRequestSchema = Schema.Struct(
  viewReportRequestFields,
).annotations({
  identifier: "ViewReportRequest",
  description: viewReportSchemaCopy.requestDescription,
});

export type ViewReportRawInput = typeof ViewReportRequestSchema.Encoded;
export type ViewReportRequest = typeof ViewReportRequestSchema.Type;

export const decodeViewReportRequest = Schema.decodeUnknownSync(
  ViewReportRequestSchema,
);

export const viewReportInputKeys = Object.keys(
  viewReportRequestFields,
) as readonly (keyof typeof viewReportRequestFields)[];

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
  receipt: viewReportValidationCopy.expectedReceipt,
  documentId: viewReportValidationCopy.expectedNonEmptyString,
  sectionId: viewReportValidationCopy.expectedNonEmptyString,
  outputFormat: viewReportValidationCopy.expectedOutputFormat,
  maxBytes: viewReportValidationCopy.expectedMaxBytes,
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

export const resolveViewReportRequest = (
  input: Partial<ViewReportRawInput> & Record<string, unknown>,
): ViewReportRequest => {
  const allowedKeys = new Set<string>(viewReportInputKeys);
  const unknownKey = Object.keys(input).find((key) => !allowedKeys.has(key));

  if (unknownKey !== undefined) {
    throw new InvalidViewReportRequest({
      code: "unknown_parameter",
      parameter: unknownKey,
      expected: viewReportInputKeys.join(","),
      actual: input[unknownKey],
      message: viewReportValidationCopy.unknownParameter(unknownKey),
    });
  }

  try {
    const request = decodeViewReportRequest(input);
    const receiptNumber = extractReceiptNumber(request.receipt);

    if (receiptNumber === undefined) {
      throw new InvalidViewReportRequest({
        code: "invalid_parameter",
        parameter: "receipt",
        expected: viewReportValidationCopy.expectedReceipt,
        actual: request.receipt,
        message: viewReportValidationCopy.invalidParameter(
          "receipt",
          viewReportValidationCopy.expectedReceipt,
        ),
      });
    }

    return request;
  } catch (error) {
    if (error instanceof InvalidViewReportRequest) {
      throw error;
    }

    if (error instanceof ParseResult.ParseError) {
      const [parameter] = collectIssuePath(error.issue);
      const parameterName = typeof parameter === "string" ? parameter : "input";
      const expected = fieldExpected[parameterName] ?? "valid_view_report_input";
      const actual = input[parameterName];
      const missing = actual === undefined;

      throw new InvalidViewReportRequest({
        code: missing ? "missing_parameter" : "invalid_parameter",
        parameter: parameterName,
        expected,
        actual,
        message: missing
          ? viewReportValidationCopy.missingRequired(parameterName, expected)
          : viewReportValidationCopy.invalidParameter(parameterName, expected),
      });
    }

    throw error;
  }
};
