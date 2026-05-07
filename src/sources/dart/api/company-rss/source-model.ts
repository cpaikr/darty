import { Schema } from "effect";

const receiptNumberSchema = Schema.String.pipe(Schema.pattern(/^\d{14}$/));

export const SourceCompanyRssChannel = Schema.Struct({
  title: Schema.String,
  link: Schema.String,
  description: Schema.optional(Schema.String),
  language: Schema.optional(Schema.String),
  publishedAt: Schema.optional(Schema.String),
});
export type SourceCompanyRssChannel = typeof SourceCompanyRssChannel.Type;

export const SourceCompanyRssItem = Schema.Struct({
  title: Schema.NonEmptyString,
  link: Schema.NonEmptyString,
  receiptNumber: Schema.optional(receiptNumberSchema),
  publishedAt: Schema.optional(Schema.String),
  creator: Schema.optional(Schema.String),
  guid: Schema.optional(Schema.String),
});
export type SourceCompanyRssItem = typeof SourceCompanyRssItem.Type;

export const SourceCompanyRssFeed = Schema.Struct({
  channel: SourceCompanyRssChannel,
  items: Schema.Array(SourceCompanyRssItem),
  fetchedAt: Schema.String,
  sourceUrl: Schema.String,
});
export type SourceCompanyRssFeed = typeof SourceCompanyRssFeed.Type;
