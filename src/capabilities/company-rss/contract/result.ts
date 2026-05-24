import { Schema } from "effect";

import {
  annotateSchema,
  describedString,
  nonNegativeInt,
} from "../../schema-annotations.ts";
import { companyRssSchemaCopy } from "../copy.ts";
import {
  CompanyRssRequestSchema,
  type CompanyRssRequest,
} from "./request.ts";

const receiptNumberSchema = annotateSchema(
  Schema.String.pipe(Schema.pattern(/^\d{14}$/)),
  {
    description: "14-digit DART receipt number (rcpNo). Can be used as view-report receipt.",
    examples: ["20260331004166"],
  },
);

export const CompanyRssChannelSchema = Schema.Struct({
  title: describedString("DART companyRSS channel title."),
  link: describedString("DART companyRSS channel link."),
  description: Schema.optional(describedString("DART companyRSS channel description.")),
  language: Schema.optional(describedString("RSS language code.")),
  publishedAt: Schema.optional(describedString("RSS channel publication time.")),
});
export type CompanyRssChannel = typeof CompanyRssChannelSchema.Type;

export const CompanyRssItemSchema = Schema.Struct({
  title: annotateSchema(Schema.NonEmptyString, {
    description: "RSS item title, usually a DART disclosure report name.",
  }),
  link: annotateSchema(Schema.NonEmptyString, {
    description: "DART /dsaf001/main.do?rcpNo=... report-viewer URL. Can be used as view-report receipt.",
  }),
  receiptNumber: Schema.optional(receiptNumberSchema),
  publishedAt: Schema.optional(describedString("RSS item publication time.")),
  creator: Schema.optional(describedString("RSS dc:creator value, usually 제출인명.")),
  guid: Schema.optional(describedString("RSS guid value.")),
});
export type CompanyRssItem = typeof CompanyRssItemSchema.Type;

export const CompanyRssMetadataSchema = Schema.Struct({
  fetchedAt: describedString("ISO timestamp when the DART companyRSS response was processed."),
  source: Schema.Struct({
    system: annotateSchema(Schema.Literal("dart"), { description: "Source system." }),
    surface: annotateSchema(Schema.Literal("companyRSS"), {
      description: "DART companyRSS surface used.",
    }),
    endpoint: describedString("DART companyRSS endpoint."),
  }),
  completeness: annotateSchema(Schema.Literal("complete"), {
    description: "company-rss currently returns only complete successful results.",
  }),
  itemCount: nonNegativeInt("Number of items in this RSS response."),
});
export type CompanyRssMetadata = typeof CompanyRssMetadataSchema.Type;

export const CompanyRssReferencesSchema = Schema.Struct({
  rssUrl: describedString("DART companyRSS XML URL."),
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
type CompanyRssSchemaResult = typeof CompanyRssResultSchema.Type;
export type CompanyRssResult = Omit<CompanyRssSchemaResult, "result"> & {
  readonly result: Omit<CompanyRssSchemaResult["result"], "request"> & {
    readonly request: CompanyRssRequest;
  };
};
