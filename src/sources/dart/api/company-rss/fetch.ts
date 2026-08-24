import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect } from "effect";

import { ParseFailure, SourceChanged, SourceUnavailable } from "../../errors.ts";
import type { DartSourceTextResponse } from "../../source-response.ts";
import {
  dartFetchHttpClientLayer,
  dartTransportLimits,
  requestDartTextResponse,
} from "../../transport.ts";
import { companyRssMessages } from "./messages.ts";
import { parseCompanyRssXml } from "./parse-xml.ts";
import type { SourceCompanyRssFeed } from "./source-model.ts";

const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export const toCompanyRssUrl = (companyCode: string): string =>
  (() => {
    const url = new URL("/api/companyRSS.xml", "https://dart.fss.or.kr");
    url.searchParams.set("crpCd", companyCode);
    return url.toString();
  })();

export const fetchCompanyRssXml = (
  companyCode: string,
): Effect.Effect<
  DartSourceTextResponse,
  SourceUnavailable | ParseFailure,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const sourceUrl = toCompanyRssUrl(companyCode);
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(sourceUrl).pipe(
      HttpClientRequest.setHeader("user-agent", chromeDesktopUserAgent),
    );

    return yield* requestDartTextResponse(client, request, {
      sourceUrl,
      unavailableMessage: companyRssMessages.sourceUnavailable,
      parseFailureMessage: companyRssMessages.xmlDecodeFailure,
      maxBytes: dartTransportLimits.companyRss,
      responseKind: "xml",
    });
  });

export const fetchCompanyRssFeed = (
  companyCode: string,
): Effect.Effect<
  SourceCompanyRssFeed,
  SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const response = yield* fetchCompanyRssXml(companyCode);
    return yield* parseCompanyRssXml(response);
  }).pipe(Effect.provide(dartFetchHttpClientLayer));
