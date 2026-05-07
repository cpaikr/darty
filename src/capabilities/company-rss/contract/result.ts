import { Schema } from "effect";

import { companyRssSchemaCopy } from "../copy.ts";
import { CompanyRssRequestSchema } from "./request.ts";

const receiptNumberSchema = Schema.String.pipe(Schema.pattern(/^\d{14}$/));

export const CompanyRssChannelSchema = Schema.Struct({
  title: Schema.String,
  link: Schema.String,
  description: Schema.optional(Schema.String),
  language: Schema.optional(Schema.String),
  publishedAt: Schema.optional(Schema.String),
});
export type CompanyRssChannel = typeof CompanyRssChannelSchema.Type;

export const CompanyRssItemSchema = Schema.Struct({
  title: Schema.NonEmptyString,
  link: Schema.NonEmptyString,
  receiptNumber: Schema.optional(receiptNumberSchema),
  publishedAt: Schema.optional(Schema.String),
  creator: Schema.optional(Schema.String),
  guid: Schema.optional(Schema.String),
});
export type CompanyRssItem = typeof CompanyRssItemSchema.Type;

export const CompanyRssMetadataSchema = Schema.Struct({
  fetchedAt: Schema.String,
  source: Schema.Struct({
    system: Schema.Literal("dart"),
    surface: Schema.Literal("companyRSS"),
    endpoint: Schema.String,
  }),
  completeness: Schema.Literal("complete"),
  itemCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
});
export type CompanyRssMetadata = typeof CompanyRssMetadataSchema.Type;

export const CompanyRssReferencesSchema = Schema.Struct({
  rssUrl: Schema.String,
});
export type CompanyRssReferences = typeof CompanyRssReferencesSchema.Type;

export const CompanyRssResultSchema = Schema.Struct({
  result: Schema.Struct({
    request: CompanyRssRequestSchema,
    channel: CompanyRssChannelSchema,
    items: Schema.Array(CompanyRssItemSchema),
  }),
  metadata: CompanyRssMetadataSchema,
  references: CompanyRssReferencesSchema,
}).annotations({
  identifier: "CompanyRssResult",
  description: companyRssSchemaCopy.resultDescription,
});
export type CompanyRssResult = typeof CompanyRssResultSchema.Type;
