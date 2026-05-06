import { Schema } from "effect";

import {
  searchBodyFieldCopy,
  searchBodySchemaCopy,
} from "../copy.ts";

const datePattern = /^\d{8}$/;
const companyCodePattern = /^\d{8}$/;

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

const SearchBodyDateString = annotateSchema(
  Schema.String.pipe(Schema.pattern(datePattern)),
  {
    identifier: "SearchBodyDateString",
    description: searchBodySchemaCopy.dateStringDescription,
  },
);

export const searchBodySortByValues = ["date", "reportName"] as const;
export type SearchBodySortBy =
  (typeof searchBodySortByValues)[number];

const SearchBodySortBySchema = Schema.Literal(...searchBodySortByValues);

export const searchBodySortDirectionValues = ["asc", "desc"] as const;
export type SearchBodySortDirection =
  (typeof searchBodySortDirectionValues)[number];

const SearchBodySortDirectionSchema = Schema.Literal(
  ...searchBodySortDirectionValues,
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

type PatternStringFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "patternString";
  readonly expectedToken: string;
};

type DateFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "date";
};

export type FieldSpecShape =
  | IntegerFieldSpecShape
  | EnumFieldSpecShape
  | StringFieldSpecShape
  | PatternStringFieldSpecShape
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
      description: searchBodyFieldCopy.page.description,
    },
    sortBy: {
      kind: "enum",
      enumValues: searchBodySortByValues,
      defaultValue: "date",
      schema: SearchBodySortBySchema,
      description: searchBodyFieldCopy.sortBy.description,
    },
    sortDirection: {
      kind: "enum",
      enumValues: searchBodySortDirectionValues,
      defaultValue: "desc",
      schema: SearchBodySortDirectionSchema,
      description: searchBodyFieldCopy.sortDirection.description,
    },
  } as const satisfies Record<string, DefaultedFieldSpecShape>,
  required: {
    keyword: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchBodyFieldCopy.keyword.description,
    },
    startDate: {
      kind: "date",
      schema: SearchBodyDateString,
      description: searchBodyFieldCopy.startDate.description,
    },
    endDate: {
      kind: "date",
      schema: SearchBodyDateString,
      description: searchBodyFieldCopy.endDate.description,
    },
  } as const satisfies Record<string, RequiredFieldSpecShape>,
  optional: {
    companyCode: {
      kind: "patternString",
      expectedToken: "8_digit_company_code",
      schema: Schema.String.pipe(Schema.pattern(companyCodePattern)),
      description: searchBodyFieldCopy.companyCode.description,
    },
    presenterName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchBodyFieldCopy.presenterName.description,
    },
    reportName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchBodyFieldCopy.reportName.description,
    },
  } as const satisfies Record<string, FieldSpecShape>,
} as const;

export const searchBodyFieldSpecs = {
  ...inputSpecs.defaulted,
  ...inputSpecs.required,
  ...inputSpecs.optional,
} as const;

export type SearchBodyInputKey = keyof typeof searchBodyFieldSpecs;

export type SearchBodyFieldSpec =
  (typeof searchBodyFieldSpecs)[SearchBodyInputKey];

const searchBodyRequestFields = {
  page: defaultedField(searchBodyFieldSpecs.page),
  sortBy: defaultedField(searchBodyFieldSpecs.sortBy),
  sortDirection: defaultedField(searchBodyFieldSpecs.sortDirection),
  keyword: requiredField(searchBodyFieldSpecs.keyword),
  startDate: requiredField(searchBodyFieldSpecs.startDate),
  endDate: requiredField(searchBodyFieldSpecs.endDate),
  companyCode: optionalField(searchBodyFieldSpecs.companyCode),
  presenterName: optionalField(searchBodyFieldSpecs.presenterName),
  reportName: optionalField(searchBodyFieldSpecs.reportName),
} as const;

export const SearchBodyRequestSchema = Schema.Struct(
  searchBodyRequestFields,
).annotations({
  identifier: "SearchBodyRequest",
  description: searchBodySchemaCopy.requestDescription,
});

export type SearchBodyRawInput = typeof SearchBodyRequestSchema.Encoded;
export type SearchBodyRequest = typeof SearchBodyRequestSchema.Type;

export const decodeSearchBodyRequest = Schema.decodeUnknownEither(
  SearchBodyRequestSchema,
);

