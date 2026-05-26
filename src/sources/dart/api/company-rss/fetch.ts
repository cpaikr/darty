import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect } from "effect";

import { ParseFailure, SourceChanged, SourceUnavailable } from "../../errors.ts";
import {
  toHttpFailureDiagnostics,
  toHttpResponseDiagnostics,
  toTextDecodeFailureDiagnostics,
} from "../../http-diagnostics.ts";
import {
  createDartSourceTextResponse,
  type DartSourceTextResponse,
} from "../../source-response.ts";
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

    return createDartSourceTextResponse(
      xml,
      sourceUrl,
      toHttpResponseDiagnostics(response, xml),
    );
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
  }).pipe(Effect.provide(FetchHttpClient.layer));
