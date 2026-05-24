import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
} from "../../schema-annotations.ts";
import { companyDetailSchemaCopy } from "../copy.ts";
import { CompanyDetailRequestSchema } from "./request.ts";

const DartCompanyCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{8}$/)),
  {
    description: "8-digit DART company code.",
    examples: ["00126380"],
  },
);
const ListedStockCodeSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{6}$/)),
  {
    description: "6-digit listed-company stock code. This differs from the DART company code.",
    examples: ["005930"],
  },
);

export const CompanyDetailInfoSchema = Schema.Struct({
  companyCode: DartCompanyCodeSchema,
  companyName: describedString("Company name on the DART 기업개황 detail page."),
  englishName: Schema.optional(describedString("English company name provided by DART.")),
  disclosureCompanyName: Schema.optional(describedString("DART disclosure-subject company name.")),
  stockCode: Schema.optional(ListedStockCodeSchema),
  representativeName: Schema.optional(describedString("Representative name.")),
  corporationKind: Schema.optional(describedString("DART corporation/market category text.")),
  corporateRegistrationNumber: Schema.optional(describedString("Corporate registration number.")),
  businessRegistrationNumber: Schema.optional(describedString("Business registration number.")),
  address: Schema.optional(describedString("Company address.")),
  homepage: Schema.optional(describedString("Company homepage URL provided by DART.")),
  phoneNumber: Schema.optional(describedString("Main phone number.")),
  faxNumber: Schema.optional(describedString("Fax number.")),
  industryName: Schema.optional(describedString("Industry name.")),
  establishedDate: Schema.optional(describedString("Establishment date.")),
  fiscalMonth: Schema.optional(describedString("Fiscal closing month.")),
});
export type CompanyDetailInfo = typeof CompanyDetailInfoSchema.Type;

export const CompanyDetailMetadataSchema = Schema.Struct({
  fetchedAt: describedString("ISO timestamp when the DART 기업개황 detail response was processed."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "Source system." }),
    surface: annotateSchema(Schema.Literal("dsae001"), {
      description: "DART 기업개황 surface used.",
    }),
    endpoint: describedString("DART 기업개황 detail endpoint."),
  }),
  completeness: annotateSchema(Schema.Literal("complete"), {
    description: "company-detail currently returns only complete successful results.",
  }),
});
export type CompanyDetailMetadata = typeof CompanyDetailMetadataSchema.Type;

export const CompanyDetailReferencesSchema = Schema.Struct({
  detailUrl: describedString("DART 기업개황 detail lookup URL."),
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
