import { Schema } from "effect";

import { searchCompanyFieldCopy, searchCompanySchemaCopy } from "../copy.ts";

type AnnotatableSchema<S> = S & {
  annotations: (annotations: Record<PropertyKey, unknown>) => S;
};

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S => (schema as AnnotatableSchema<S>).annotations(annotations) as S;

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

export const searchCompanyFieldSpecs = {
  page: {
    kind: "integer",
    minimum: 1,
    maximum: 100,
    defaultValue: 1,
    schema: Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(100),
    ),
    description: searchCompanyFieldCopy.page.description,
  },
  pageSize: {
    kind: "integer",
    minimum: 1,
    maximum: 45,
    defaultValue: 45,
    schema: Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(45),
    ),
    description: searchCompanyFieldCopy.pageSize.description,
  },
  companyName: {
    kind: "string",
    minimumLength: 2,
    schema: Schema.String.pipe(Schema.minLength(2)),
    description: searchCompanyFieldCopy.companyName.description,
  },
} as const;

export type SearchCompanyInputKey = keyof typeof searchCompanyFieldSpecs;

const searchCompanyRequestFields = {
  page: defaultedField(searchCompanyFieldSpecs.page),
  pageSize: defaultedField(searchCompanyFieldSpecs.pageSize),
  companyName: requiredField(searchCompanyFieldSpecs.companyName),
} as const;

export const SearchCompanyRequestSchema = Schema.Struct(
  searchCompanyRequestFields,
).annotations({
  identifier: "SearchCompanyRequest",
  description: searchCompanySchemaCopy.requestDescription,
});

export type SearchCompanyRawInput = typeof SearchCompanyRequestSchema.Encoded;
export type SearchCompanyRequest = typeof SearchCompanyRequestSchema.Type;
