import { Schema } from "effect";

export type SchemaAnnotationMap = Record<PropertyKey, unknown>;

export type FieldAnnotationSpec = {
  readonly description: string;
  readonly examples?: readonly unknown[] | undefined;
};

type AnnotatableSchema<S> = S & {
  annotations: (annotations: SchemaAnnotationMap) => S;
};

export const annotateSchema = <S>(
  schema: S,
  annotations: SchemaAnnotationMap,
): S => (schema as AnnotatableSchema<S>).annotations(annotations) as S;

export const fieldAnnotations = (spec: FieldAnnotationSpec) => ({
  description: spec.description,
  ...(spec.examples === undefined ? {} : { examples: spec.examples }),
});

export const describedString = (
  description: string,
  examples?: readonly string[],
) => annotateSchema(Schema.String, fieldAnnotations({ description, examples }));

export const describedNonEmptyString = (
  description: string,
  examples?: readonly string[],
) =>
  annotateSchema(
    Schema.NonEmptyString,
    fieldAnnotations({ description, examples }),
  );

export const describedBoolean = (description: string) =>
  annotateSchema(Schema.Boolean, { description });

export const nonNegativeInt = (description: string) =>
  annotateSchema(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)), {
    description,
  });

export const defaultedField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
  readonly examples?: readonly unknown[] | undefined;
  readonly defaultValue: A;
}) =>
  annotateSchema(
    Schema.optionalWith(
      annotateSchema(spec.schema, fieldAnnotations(spec)),
      { default: () => spec.defaultValue },
    ),
    { default: spec.defaultValue },
  );

export const requiredField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
  readonly examples?: readonly unknown[] | undefined;
}) => annotateSchema(spec.schema, fieldAnnotations(spec));

export const optionalField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
  readonly examples?: readonly unknown[] | undefined;
}) => Schema.optional(annotateSchema(spec.schema, fieldAnnotations(spec)));
