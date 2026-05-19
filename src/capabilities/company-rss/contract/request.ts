import { Schema } from "effect";

import { annotateSchema } from "../../schema-annotations.ts";
import { companyRssFieldCopy, companyRssSchemaCopy } from "../copy.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

export const companyRssFieldSpecs = {
  companyCode: {
    kind: "patternString",
    expectedToken: "8_digit_company_code",
    schema: DartCompanyCodeSchema,
    description: companyRssFieldCopy.companyCode.description,
  },
} as const;

export type CompanyRssInputKey = keyof typeof companyRssFieldSpecs;

export const CompanyRssRequestSchema = Schema.Struct({
  companyCode: annotateSchema(DartCompanyCodeSchema, {
    description: companyRssFieldCopy.companyCode.description,
    examples: ["00126380"],
  }),
}).annotations({
  identifier: "CompanyRssRequest",
  description: companyRssSchemaCopy.requestDescription,
  examples: companyRssSchemaCopy.requestExamples,
});

export type CompanyRssRawInput = typeof CompanyRssRequestSchema.Encoded;
export type CompanyRssRequest = typeof CompanyRssRequestSchema.Type;
