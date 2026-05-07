import { Schema } from "effect";

import { companyRssFieldCopy, companyRssSchemaCopy } from "../copy.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S =>
  (schema as S & { annotations: (annotations: Record<PropertyKey, unknown>) => S })
    .annotations(annotations);

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
  }),
}).annotations({
  identifier: "CompanyRssRequest",
  description: companyRssSchemaCopy.requestDescription,
});

export type CompanyRssRawInput = typeof CompanyRssRequestSchema.Encoded;
export type CompanyRssRequest = typeof CompanyRssRequestSchema.Type;
