import { Schema } from "effect";

const DartCompanyCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{8}$/));
const ListedStockCodeSchema = Schema.String.pipe(Schema.pattern(/^\d{6}$/));

export const SourceCompanyDetail = Schema.Struct({
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
export type SourceCompanyDetail = typeof SourceCompanyDetail.Type;

export const SourceCompanyDetailPage = Schema.Struct({
  company: SourceCompanyDetail,
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type SourceCompanyDetailPage = typeof SourceCompanyDetailPage.Type;
