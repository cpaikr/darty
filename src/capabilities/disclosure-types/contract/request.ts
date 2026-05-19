import { Schema } from "effect";

import { optionalField } from "../../schema-annotations.ts";
import { disclosureTypesFieldCopy, disclosureTypesSchemaCopy } from "../copy.ts";
import { disclosureTypeCategoryValues } from "../data.ts";

export const DisclosureTypeCategorySchema = Schema.Literal(
  ...disclosureTypeCategoryValues,
);

export type DisclosureTypesFieldSpec = {
  readonly kind: "category" | "string";
  readonly description: string;
  readonly examples?: readonly unknown[];
  readonly schema: unknown;
};

export const disclosureTypesFieldSpecs = {
  category: {
    kind: "category",
    schema: DisclosureTypeCategorySchema,
    description: disclosureTypesFieldCopy.category.description,
    examples: ["A", "I"],
  },
  query: {
    kind: "string",
    schema: Schema.NonEmptyString,
    description: disclosureTypesFieldCopy.query.description,
    examples: ["사업보고서", "A001"],
  },
} as const satisfies Record<string, DisclosureTypesFieldSpec>;

export type DisclosureTypesInputKey = keyof typeof disclosureTypesFieldSpecs;

const disclosureTypesRequestFields = {
  category: optionalField(disclosureTypesFieldSpecs.category),
  query: optionalField(disclosureTypesFieldSpecs.query),
} as const;

export const DisclosureTypesRequestSchema = Schema.Struct(
  disclosureTypesRequestFields,
).annotations({
  identifier: "DisclosureTypesRequest",
  description: disclosureTypesSchemaCopy.requestDescription,
  examples: disclosureTypesSchemaCopy.requestExamples,
});

export type DisclosureTypesRawInput = typeof DisclosureTypesRequestSchema.Encoded;
export type DisclosureTypesRequest = typeof DisclosureTypesRequestSchema.Type;
