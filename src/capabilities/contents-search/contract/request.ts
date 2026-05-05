import { Schema } from "effect";

import {
  contentsSearchFieldCopy,
  contentsSearchSchemaCopy,
} from "../copy.ts";

const datePattern = /^\d{8}$/;

type AnnotatableSchema<S> = S & {
  annotations: (
    annotations: Record<PropertyKey, unknown>,
  ) => S;
};

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S =>
  (schema as AnnotatableSchema<S>).annotations(annotations) as S;

const ContentsSearchDateString = annotateSchema(
  Schema.String.pipe(Schema.pattern(datePattern)),
  {
    identifier: "ContentsSearchDateString",
    description: contentsSearchSchemaCopy.dateStringDescription,
  },
);

export const contentsSearchSortByValues = ["date", "reportName"] as const;
export type ContentsSearchSortBy =
  (typeof contentsSearchSortByValues)[number];

const ContentsSearchSortBySchema = Schema.Literal(...contentsSearchSortByValues);

export const contentsSearchSortDirectionValues = ["asc", "desc"] as const;
export type ContentsSearchSortDirection =
  (typeof contentsSearchSortDirectionValues)[number];

const ContentsSearchSortDirectionSchema = Schema.Literal(
  ...contentsSearchSortDirectionValues,
);

type BaseFieldSpecShape = {
  readonly description: string;
  readonly schema: unknown;
};

type IntegerFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "integer";
  readonly minimum: number;
  readonly maximum: number;
};

type EnumFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "enum";
  readonly enumValues: readonly string[];
};

type StringFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "string";
  readonly nonEmpty: true;
};

type DateFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "date";
};

export type FieldSpecShape =
  | IntegerFieldSpecShape
  | EnumFieldSpecShape
  | StringFieldSpecShape
  | DateFieldSpecShape;

type DefaultedFieldSpecShape = FieldSpecShape & {
  readonly defaultValue: unknown;
};

type RequiredFieldSpecShape = FieldSpecShape;

const defaultedField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
  readonly defaultValue: A;
}) =>
  annotateSchema(
    Schema.optionalWith(
      annotateSchema(spec.schema, {
        description: spec.description,
      }),
      { default: () => spec.defaultValue },
    ),
    { default: spec.defaultValue },
  );

const requiredField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
}) =>
  annotateSchema(spec.schema, {
    description: spec.description,
  });

const optionalField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
}) =>
  Schema.optional(
    annotateSchema(spec.schema, {
      description: spec.description,
    }),
  );

const inputSpecs = {
  defaulted: {
    page: {
      kind: "integer",
      minimum: 1,
      maximum: 100,
      defaultValue: 1,
      schema: Schema.Int.pipe(
        Schema.greaterThanOrEqualTo(1),
        Schema.lessThanOrEqualTo(100),
      ),
      description: contentsSearchFieldCopy.page.description,
    },
    sortBy: {
      kind: "enum",
      enumValues: contentsSearchSortByValues,
      defaultValue: "date",
      schema: ContentsSearchSortBySchema,
      description: contentsSearchFieldCopy.sortBy.description,
    },
    sortDirection: {
      kind: "enum",
      enumValues: contentsSearchSortDirectionValues,
      defaultValue: "desc",
      schema: ContentsSearchSortDirectionSchema,
      description: contentsSearchFieldCopy.sortDirection.description,
    },
  } as const satisfies Record<string, DefaultedFieldSpecShape>,
  required: {
    keyword: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: contentsSearchFieldCopy.keyword.description,
    },
    startDate: {
      kind: "date",
      schema: ContentsSearchDateString,
      description: contentsSearchFieldCopy.startDate.description,
    },
    endDate: {
      kind: "date",
      schema: ContentsSearchDateString,
      description: contentsSearchFieldCopy.endDate.description,
    },
  } as const satisfies Record<string, RequiredFieldSpecShape>,
  optional: {
    companyCode: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: contentsSearchFieldCopy.companyCode.description,
    },
    presenterName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: contentsSearchFieldCopy.presenterName.description,
    },
    reportName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: contentsSearchFieldCopy.reportName.description,
    },
  } as const satisfies Record<string, FieldSpecShape>,
} as const;

export const contentsSearchFieldSpecs = {
  ...inputSpecs.defaulted,
  ...inputSpecs.required,
  ...inputSpecs.optional,
} as const;

export type ContentsSearchInputKey = keyof typeof contentsSearchFieldSpecs;

export type ContentsSearchFieldSpec =
  (typeof contentsSearchFieldSpecs)[ContentsSearchInputKey];

const contentsSearchRequestFields = {
  page: defaultedField(contentsSearchFieldSpecs.page),
  sortBy: defaultedField(contentsSearchFieldSpecs.sortBy),
  sortDirection: defaultedField(contentsSearchFieldSpecs.sortDirection),
  keyword: requiredField(contentsSearchFieldSpecs.keyword),
  startDate: requiredField(contentsSearchFieldSpecs.startDate),
  endDate: requiredField(contentsSearchFieldSpecs.endDate),
  companyCode: optionalField(contentsSearchFieldSpecs.companyCode),
  presenterName: optionalField(contentsSearchFieldSpecs.presenterName),
  reportName: optionalField(contentsSearchFieldSpecs.reportName),
} as const;

export const ContentsSearchRequestSchema = Schema.Struct(
  contentsSearchRequestFields,
).annotations({
  identifier: "ContentsSearchRequest",
  description: contentsSearchSchemaCopy.requestDescription,
});

export type ContentsSearchRawInput = typeof ContentsSearchRequestSchema.Encoded;
export type ContentsSearchRequest = typeof ContentsSearchRequestSchema.Type;

export const decodeContentsSearchRequest = Schema.decodeUnknownEither(
  ContentsSearchRequestSchema,
);

