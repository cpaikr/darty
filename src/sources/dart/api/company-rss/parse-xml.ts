import * as cheerio from "cheerio";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import {
  getSourceResponseErrorContext,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { companyRssMessages } from "./messages.ts";
import {
  SourceCompanyRssFeed,
  type SourceCompanyRssItem,
} from "./source-model.ts";

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const optionalText = (value: string): string | undefined => {
  const collapsed = collapseWhitespace(value);
  return collapsed.length === 0 ? undefined : collapsed;
};

const receiptFromLink = (link: string): string | undefined => {
  try {
    const url = new URL(link);
    const rcpNo = url.searchParams.get("rcpNo");
    return rcpNo !== null && /^\d{14}$/.test(rcpNo) ? rcpNo : undefined;
  } catch {
    return undefined;
  }
};

export const parseCompanyRssXml = (
  response: DartSourceTextResponse,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceCompanyRssFeed>,
  SourceChanged | ParseFailure
> => {
  const xml = response.body;
  const sourceUrl = response.sourceUrl;

  return Effect.gen(function* () {
    const $ = cheerio.load(xml, { xmlMode: true });
    const channel = $("channel").first();

    if (channel.length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: companyRssMessages.missingChannel,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const title = optionalText(channel.children("title").first().text());
    if (title === undefined) {
      return yield* Effect.fail(
        new SourceChanged({
          message: companyRssMessages.missingChannelTitle,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const link = optionalText(channel.children("link").first().text());
    if (link === undefined) {
      return yield* Effect.fail(
        new SourceChanged({
          message: companyRssMessages.missingChannelLink,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const items: SourceCompanyRssItem[] = [];

    for (const item of channel.children("item").toArray()) {
      const element = $(item);
      const title = optionalText(element.children("title").first().text());
      const link = optionalText(element.children("link").first().text());

      if (title === undefined || link === undefined) {
        return yield* Effect.fail(
          new SourceChanged({
            message: companyRssMessages.missingItemField,
            ...getSourceResponseErrorContext(response),
          }),
        );
      }

      items.push({
        title,
        link,
        receiptNumber: receiptFromLink(link),
        publishedAt:
          optionalText(element.children("dc\\:date, date").first().text()) ??
          optionalText(element.children("pubDate").first().text()),
        creator: optionalText(
          element.children("dc\\:creator, creator").first().text(),
        ),
        guid: optionalText(element.children("guid").first().text()),
      });
    }

    return yield* Schema.decodeUnknown(SourceCompanyRssFeed)({
      channel: {
        title,
        link,
        description: optionalText(channel.children("description").first().text()),
        language: optionalText(channel.children("language").first().text()),
        publishedAt: optionalText(channel.children("dc\\:date, date").first().text()) ??
          optionalText(channel.children("pubDate").first().text()),
      },
      items,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
    });
  }).pipe(
    Effect.mapError((error) =>
      error instanceof ParseFailure || error instanceof SourceChanged
        ? error
        : new ParseFailure({
            message: companyRssMessages.sourceSchemaMismatch,
            sourceUrl,
            diagnostics: toParseFailureDiagnostics({
              reason: companyRssMessages.sourceSchemaMismatch,
              response,
              cause: error,
            }),
          }),
    ),
  );
};
