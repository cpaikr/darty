import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect } from "effect";

import { ParseFailure, SourceChanged, SourceUnavailable } from "../../errors.ts";
import {
  toHttpFailureDiagnostics,
  toTextDecodeFailureDiagnostics,
} from "../../http-diagnostics.ts";
import { companyRssMessages } from "./messages.ts";
import { parseCompanyRssXml } from "./parse-xml.ts";
import type { SourceCompanyRssFeed } from "./source-model.ts";

const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export const toCompanyRssUrl = (companyCode: string): string =>
  `https://dart.fss.or.kr/api/companyRSS.xml?crpCd=${companyCode}`;

export const fetchCompanyRssXml = (
  companyCode: string,
): Effect.Effect<
  { readonly xml: string; readonly sourceUrl: string },
  SourceUnavailable | ParseFailure,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const sourceUrl = toCompanyRssUrl(companyCode);
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(sourceUrl).pipe(
      HttpClientRequest.setHeader("user-agent", chromeDesktopUserAgent),
    );

    const response = yield* client.execute(request).pipe(
      Effect.mapError(
        (error) =>
          new SourceUnavailable({
            message: companyRssMessages.sourceUnavailable,
            sourceUrl,
            diagnostics: toHttpFailureDiagnostics(error),
          }),
      ),
    );

    const xml = yield* response.text.pipe(
      Effect.mapError(
        (error) =>
          new ParseFailure({
            message: companyRssMessages.xmlDecodeFailure,
            sourceUrl,
            diagnostics: toTextDecodeFailureDiagnostics(response, error),
          }),
      ),
    );

    return { xml, sourceUrl };
  });

export const fetchCompanyRssFeed = (
  companyCode: string,
): Effect.Effect<
  SourceCompanyRssFeed,
  SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const { xml, sourceUrl } = yield* fetchCompanyRssXml(companyCode);
    return yield* parseCompanyRssXml(xml, sourceUrl);
  }).pipe(Effect.provide(FetchHttpClient.layer));
