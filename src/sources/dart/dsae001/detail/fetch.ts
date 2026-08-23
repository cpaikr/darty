import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect } from "effect";

import {
  ParseFailure,
  SourceChanged,
  SourceNotFound,
  SourceUnavailable,
} from "../../errors.ts";
import type { DartSourceTextResponse } from "../../source-response.ts";
import {
  dartFetchHttpClientLayer,
  dartTransportLimits,
  requestDartTextResponse,
} from "../../transport.ts";
import { toDsae001CompanyDetailUrl } from "../urls.ts";
import { dsae001DetailMessages } from "./messages.ts";
import { parseCompanyDetailHtml } from "./parse-html.ts";
import type { SourceCompanyDetailPage } from "./source-model.ts";

const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export const toCompanyDetailUrl = toDsae001CompanyDetailUrl;

export const fetchCompanyDetailHtml = (
  companyCode: string,
): Effect.Effect<
  DartSourceTextResponse,
  SourceUnavailable | ParseFailure,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const sourceUrl = toCompanyDetailUrl(companyCode);
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(sourceUrl).pipe(
      HttpClientRequest.setHeader("user-agent", chromeDesktopUserAgent),
      HttpClientRequest.setHeader(
        "referer",
        "https://dart.fss.or.kr/dsae001/main.do",
      ),
    );

    return yield* requestDartTextResponse(client, request, {
      sourceUrl,
      unavailableMessage: dsae001DetailMessages.sourceUnavailable,
      parseFailureMessage: dsae001DetailMessages.htmlDecodeFailure,
      maxBytes: dartTransportLimits.companyDetail,
      responseKind: "html",
    });
  });

export const fetchCompanyDetailPage = (
  companyCode: string,
): Effect.Effect<
  SourceCompanyDetailPage,
  SourceUnavailable | SourceChanged | SourceNotFound | ParseFailure
> =>
  Effect.gen(function* () {
    const response = yield* fetchCompanyDetailHtml(companyCode);
    return yield* parseCompanyDetailHtml(response, companyCode);
  }).pipe(Effect.provide(dartFetchHttpClientLayer));
