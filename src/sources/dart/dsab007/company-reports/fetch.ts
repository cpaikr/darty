import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

import {
  InvalidInput,
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../../errors.ts";
import {
  toHttpFailureDiagnostics,
  toTextDecodeFailureDiagnostics,
} from "../../http-diagnostics.ts";
import { buildCompanyReportsSearchForm } from "./build-form.ts";
import { dsab007CompanyReportsMessages } from "./messages.ts";
import { parseCompanyReportsSearchHtml } from "./parse-html.ts";
import {
  SourceCompanyReportsReplayInput,
  type SourceCompanyReportsReplayInput as SourceCompanyReportsReplayInputType,
} from "./replay-schema.ts";
import type { SourceCompanyReportsSearchPage } from "./source-model.ts";

export const searchUrl = "https://dart.fss.or.kr/dsab007/detailSearch.ax";
const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const decodeReplayInput = (
  input: unknown,
): Effect.Effect<SourceCompanyReportsReplayInputType, InvalidInput> =>
  Schema.decodeUnknown(SourceCompanyReportsReplayInput)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidInput({
          message: ParseResult.TreeFormatter.formatIssueSync(error.issue),
        }),
    ),
  );

export const fetchCompanyReportsSearchHtml = (
  form: URLSearchParams,
): Effect.Effect<
  string,
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
        "https://dart.fss.or.kr/dsab007/main.do?option=corp",
      ),
      HttpClientRequest.bodyText(
        form.toString(),
        "application/x-www-form-urlencoded; charset=UTF-8",
      ),
    );

    const response = yield* client.execute(request).pipe(
      Effect.mapError(
        (error) =>
          new SourceUnavailable({
            message: dsab007CompanyReportsMessages.sourceUnavailable,
            sourceUrl: searchUrl,
            diagnostics: toHttpFailureDiagnostics(error),
          }),
      ),
    );

    return yield* response.text.pipe(
      Effect.mapError(
        (error) =>
          new ParseFailure({
            message: dsab007CompanyReportsMessages.htmlDecodeFailure,
            sourceUrl: searchUrl,
            diagnostics: toTextDecodeFailureDiagnostics(response, error),
          }),
      ),
    );
  });

export const searchCompanyReportsSourcePage = (
  input: unknown,
): Effect.Effect<
  SourceCompanyReportsSearchPage,
  InvalidInput | SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const request = yield* decodeReplayInput(input);
    const form = buildCompanyReportsSearchForm(request);
    const html = yield* fetchCompanyReportsSearchHtml(form);
    return yield* parseCompanyReportsSearchHtml(html, request, searchUrl);
  }).pipe(Effect.provide(FetchHttpClient.layer));
