import { Schema } from "effect";

import { annotateSchema } from "../../schema-annotations.ts";
import { companyDetailFieldCopy, companyDetailSchemaCopy } from "../copy.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

export const companyDetailFieldSpecs = {
  companyCode: {
    kind: "patternString",
    expectedToken: "8_digit_company_code",
    schema: DartCompanyCodeSchema,
    description: companyDetailFieldCopy.companyCode.description,
  },
} as const;

export type CompanyDetailInputKey = keyof typeof companyDetailFieldSpecs;

export const CompanyDetailRequestSchema = Schema.Struct({
  companyCode: annotateSchema(DartCompanyCodeSchema, {
    description: companyDetailFieldCopy.companyCode.description,
    examples: ["00126380"],
  }),
}).annotations({
  identifier: "CompanyDetailRequest",
  description: companyDetailSchemaCopy.requestDescription,
  examples: companyDetailSchemaCopy.requestExamples,
});

export type CompanyDetailRawInput = typeof CompanyDetailRequestSchema.Encoded;
export type CompanyDetailRequest = typeof CompanyDetailRequestSchema.Type;
