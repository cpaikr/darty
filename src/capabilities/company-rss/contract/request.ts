import { Schema } from "effect";

import {
  annotateSchema,
  defaultedField,
} from "../../schema-annotations.ts";
import {
  responseDetailFieldSpec,
  type ResponseDetail,
} from "../../response-detail.ts";
import { companyRssFieldCopy, companyRssSchemaCopy } from "../copy.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));

export const companyRssFieldSpecs = {
  companyCode: {
    kind: "patternString",
    expectedToken: "8_digit_company_code",
    schema: DartCompanyCodeSchema,
    description: companyRssFieldCopy.companyCode.description,
  },
  detail: responseDetailFieldSpec,
} as const;

export type CompanyRssInputKey = keyof typeof companyRssFieldSpecs;

export const CompanyRssRequestSchema = Schema.Struct({
  companyCode: annotateSchema(DartCompanyCodeSchema, {
    description: companyRssFieldCopy.companyCode.description,
    examples: ["00126380"],
  }),
  detail: defaultedField(responseDetailFieldSpec),
}).annotations({
  identifier: "CompanyRssRequest",
  description: companyRssSchemaCopy.requestDescription,
  examples: companyRssSchemaCopy.requestExamples,
});

export type CompanyRssRawInput = typeof CompanyRssRequestSchema.Encoded;
type CompanyRssResolvedRequest = typeof CompanyRssRequestSchema.Type;
export type CompanyRssRequest = Omit<CompanyRssResolvedRequest, "detail"> & {
  readonly detail?: ResponseDetail;
};
