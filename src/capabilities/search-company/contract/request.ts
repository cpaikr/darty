import { Schema } from "effect";

import {
  defaultedField,
  requiredField,
} from "../../schema-annotations.ts";
import { searchCompanyFieldCopy, searchCompanySchemaCopy } from "../copy.ts";

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
    examples: [1],
  },
  pageSize: {
    kind: "integer",
    minimum: 1,
    maximum: 45,
    defaultValue: 15,
    schema: Schema.Int.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(45),
    ),
    description: searchCompanyFieldCopy.pageSize.description,
    examples: [15],
  },
  companyName: {
    kind: "string",
    minimumLength: 2,
    schema: Schema.String.pipe(Schema.minLength(2)),
    description: searchCompanyFieldCopy.companyName.description,
    examples: ["삼성전자"],
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
  examples: searchCompanySchemaCopy.requestExamples,
});

export type SearchCompanyRawInput = typeof SearchCompanyRequestSchema.Encoded;
export type SearchCompanyRequest = typeof SearchCompanyRequestSchema.Type;
