import { Schema } from "effect";

import { annotateSchema, describedString, nonNegativeInt } from "../../schema-annotations.ts";
import { disclosureTypesSchemaCopy } from "../copy.ts";
import { DisclosureTypeCategorySchema, DisclosureTypesRequestSchema } from "./request.ts";

const DisclosureTypeCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^[A-J]\d{3}$/)),
  {
    description: "DART 공시상세유형 detailed code. Pass it to search-company-reports disclosureTypes or CLI --disclosure-type.",
    examples: ["A001", "I001"],
  },
);

export const DisclosureTypeItemSchema = Schema.Struct({
  code: DisclosureTypeCodeSchema,
  label: describedString("Korean 공시상세유형 label."),
});
export type DisclosureTypeResultItem = typeof DisclosureTypeItemSchema.Type;

export const DisclosureTypeCategoryGroupSchema = Schema.Struct({
  category: annotateSchema(DisclosureTypeCategorySchema, {
    description: "공시상세유형 category code.",
  }),
  categoryLabel: describedString("Korean 공시상세유형 category label."),
  categoryDescription: describedString(
    "Implementation-authored guidance to help choose the category.",
  ),
  items: Schema.Array(DisclosureTypeItemSchema),
});
export type DisclosureTypeResultCategoryGroup =
  typeof DisclosureTypeCategoryGroupSchema.Type;

export const DisclosureTypesMetadataSchema = Schema.Struct({
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("open-dart-docs"), {
      description: "Source document family for the detailed code list.",
    }),
    repository: describedString("Source document GitHub repository."),
    commit: describedString("Source document commit SHA."),
    path: describedString("Document path inside the source repository."),
  }),
  categoryLabelSource: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart-fss-docs"), {
      description: "Source document family used to verify category labels.",
    }),
    url: describedString("Source document URL for category labels."),
    codeSet: annotateSchema(Schema.Literal("pblntf_ty"), {
      description: "DART disclosure type category code-set name.",
    }),
  }),
  categoryDescriptionProvenance: Schema.Struct({
    status: annotateSchema(Schema.Literal("implementation_authored_guidance"), {
      description: "Indicates that category descriptions are implementation-authored guidance, not external source fields.",
    }),
    basis: describedString(
      "Source code set and item range used when writing category descriptions.",
    ),
  }),
  sourceBehavior: Schema.Struct({
    codeSet: annotateSchema(Schema.Literal("pblntf_detail_ty"), {
      description: "DART 공시상세유형 code-set name.",
    }),
    categoryCodeSet: annotateSchema(Schema.Literal("pblntf_ty"), {
      description: "DART disclosure type category code-set name.",
    }),
    observationStatus: annotateSchema(Schema.Literal("source_material"), {
      description: "Indicates a static code list reflected from external source material pinned by commit and document URL.",
    }),
  }),
  completeness: annotateSchema(Schema.Literal("complete"), {
    description: "Static code list reflection status.",
  }),
});
export type DisclosureTypesMetadata = typeof DisclosureTypesMetadataSchema.Type;

export const DisclosureTypesReferencesSchema = Schema.Struct({
  sourceUrl: describedString("Source document URL for the code list."),
});
export type DisclosureTypesReferences = typeof DisclosureTypesReferencesSchema.Type;

export const DisclosureTypesWarningSchema = Schema.Struct({
  code: annotateSchema(Schema.Literal("ambiguous_label_match"), {
    description: "Warning code returned when the same 공시상세유형 label appears in multiple category codes.",
  }),
  message: describedString("Warning explanation and required follow-up."),
});
export type DisclosureTypesWarning = typeof DisclosureTypesWarningSchema.Type;

export const DisclosureTypesResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: DisclosureTypesRequestSchema,
    totalCount: nonNegativeInt("Number of 공시상세유형 codes returned."),
    categories: Schema.Array(DisclosureTypeCategoryGroupSchema),
  }),
  metadata: DisclosureTypesMetadataSchema,
  references: DisclosureTypesReferencesSchema,
  warnings: Schema.Array(DisclosureTypesWarningSchema),
}).annotations({
  identifier: "DisclosureTypesResult",
  description: disclosureTypesSchemaCopy.resultDescription,
});
export type DisclosureTypesResult = typeof DisclosureTypesResultSchema.Type;
