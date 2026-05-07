import { Schema } from "effect";

import { companyDetailFieldCopy, companyDetailSchemaCopy } from "../copy.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S =>
  (schema as S & { annotations: (annotations: Record<PropertyKey, unknown>) => S })
    .annotations(annotations);

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
  }),
}).annotations({
  identifier: "CompanyDetailRequest",
  description: companyDetailSchemaCopy.requestDescription,
});

export type CompanyDetailRawInput = typeof CompanyDetailRequestSchema.Encoded;
export type CompanyDetailRequest = typeof CompanyDetailRequestSchema.Type;
