import { Schema } from "effect";

import { companyDetailSchemaCopy } from "../copy.ts";
import { CompanyDetailRequestSchema } from "./request.ts";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));
const ListedStockCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{6}$/));

export const CompanyDetailInfoSchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: Schema.String,
  englishName: Schema.optional(Schema.String),
  disclosureCompanyName: Schema.optional(Schema.String),
  stockCode: Schema.optional(ListedStockCodeSchema),
  representativeName: Schema.optional(Schema.String),
  corporationKind: Schema.optional(Schema.String),
  corporateRegistrationNumber: Schema.optional(Schema.String),
  businessRegistrationNumber: Schema.optional(Schema.String),
  address: Schema.optional(Schema.String),
  homepage: Schema.optional(Schema.String),
  phoneNumber: Schema.optional(Schema.String),
  faxNumber: Schema.optional(Schema.String),
  industryName: Schema.optional(Schema.String),
  establishedDate: Schema.optional(Schema.String),
  fiscalMonth: Schema.optional(Schema.String),
});
export type CompanyDetailInfo = typeof CompanyDetailInfoSchema.Type;

export const CompanyDetailMetadataSchema = Schema.Struct({
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("dsae001"),
    endpoint: Schema.String,
  }),
  completeness: Schema.Literal("complete"),
});
export type CompanyDetailMetadata = typeof CompanyDetailMetadataSchema.Type;

export const CompanyDetailReferencesSchema = Schema.Struct({
  detailUrl: Schema.String,
});
export type CompanyDetailReferences = typeof CompanyDetailReferencesSchema.Type;

export const CompanyDetailResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: CompanyDetailRequestSchema,
    company: CompanyDetailInfoSchema,
  }),
  metadata: CompanyDetailMetadataSchema,
  references: CompanyDetailReferencesSchema,
}).annotations({
  identifier: "CompanyDetailResult",
  description: companyDetailSchemaCopy.resultDescription,
});
export type CompanyDetailResult = typeof CompanyDetailResultSchema.Type;
