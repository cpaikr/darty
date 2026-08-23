import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

import {
  InvalidInput,
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../../errors.ts";
import {
  dartFetchHttpClientLayer,
  dartTransportLimits,
  requestDartTextResponse,
} from "../../transport.ts";
import type { DartSourceTextResponse } from "../../source-response.ts";
import { buildCompanySearchForm } from "./build-form.ts";
import { dsae001CompanyMessages } from "./messages.ts";
import { parseCompanySearchHtml } from "./parse-html.ts";
import {
  SourceCompanyReplayInput,
  type SourceCompanyReplayInput as SourceCompanyReplayInputType,
} from "./replay-schema.ts";
import { type SourceCompanySearchPage } from "./source-model.ts";

export const searchUrl = "https://dart.fss.or.kr/dsae001/search.ax";
const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const decodeReplayInput = (
  input: unknown,
): Effect.Effect<SourceCompanyReplayInputType, InvalidInput> =>
  Schema.decodeUnknown(SourceCompanyReplayInput)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidInput({
          message: ParseResult.TreeFormatter.formatIssueSync(error.issue),
        }),
    ),
  );

export const fetchCompanySearchHtml = (
  form: URLSearchParams,
): Effect.Effect<
  DartSourceTextResponse,
  SourceUnavailable | ParseFailure,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(searchUrl).pipe(
      HttpClientRequest.setHeader(
        "content-type",
        "application/x-www-form-urlencoded; charset=UTF-8",
      ),
      HttpClientRequest.setHeader("user-agent", chromeDesktopUserAgent),
      HttpClientRequest.setHeader(
        "referer",
        "https://dart.fss.or.kr/dsae001/main.do",
      ),
      HttpClientRequest.bodyText(
        form.toString(),
        "application/x-www-form-urlencoded; charset=UTF-8",
      ),
    );

    return yield* requestDartTextResponse(client, request, {
      sourceUrl: searchUrl,
      unavailableMessage: dsae001CompanyMessages.sourceUnavailable,
      parseFailureMessage: dsae001CompanyMessages.htmlDecodeFailure,
      maxBytes: dartTransportLimits.searchCompany,
      responseKind: "html",
    });
  });

export const searchCompanySourcePage = (
  input: unknown,
): Effect.Effect<
  SourceCompanySearchPage,
  InvalidInput | SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const request = yield* decodeReplayInput(input);
    const form = buildCompanySearchForm(request);
    const response = yield* fetchCompanySearchHtml(form);
    return yield* parseCompanySearchHtml(response, request);
  }).pipe(Effect.provide(dartFetchHttpClientLayer));
