import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

import { buildContentsSearchForm } from "./build-form.ts";
import { dsab007ContentsMessages } from "./messages.ts";
import { parseContentsSearchHtml } from "./parse-html.ts";
import {
  SourceContentsReplayInput,
  type SourceContentsReplayInput as SourceContentsReplayInputType,
} from "./replay-schema.ts";
import { type SourceContentsSearchPage } from "./source-model.ts";
import {
  InvalidInput,
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../../errors.ts";
import {
  toHttpFailureDiagnostics,
  toHttpResponseDiagnostics,
  toTextDecodeFailureDiagnostics,
} from "../../http-diagnostics.ts";
import {
  createDartSourceTextResponse,
  type DartSourceTextResponse,
} from "../../source-response.ts";

export const searchUrl = "https://dart.fss.or.kr/dsab007/search.ax";
const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const decodeReplayInput = (
  input: unknown,
): Effect.Effect<SourceContentsReplayInputType, InvalidInput> =>
  Schema.decodeUnknown(SourceContentsReplayInput)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidInput({
          message: ParseResult.TreeFormatter.formatIssueSync(error.issue),
        }),
    ),
  );

export const fetchContentsSearchHtml = (
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
      HttpClientRequest.bodyText(
        form.toString(),
        "application/x-www-form-urlencoded; charset=UTF-8",
      ),
    );

    const response = yield* client.execute(request).pipe(
      Effect.mapError(
        (error) =>
          new SourceUnavailable({
            message: dsab007ContentsMessages.sourceUnavailable,
            sourceUrl: searchUrl,
            diagnostics: toHttpFailureDiagnostics(error),
          }),
      ),
    );

    const html = yield* response.text.pipe(
      Effect.mapError(
        (error) =>
          new ParseFailure({
            message: dsab007ContentsMessages.htmlDecodeFailure,
            sourceUrl: searchUrl,
            diagnostics: toTextDecodeFailureDiagnostics(response, error),
          }),
      ),
    );

    return createDartSourceTextResponse(
      html,
      searchUrl,
      toHttpResponseDiagnostics(response, html),
    );
  });

export const searchContentsSourcePage = (
  input: unknown,
): Effect.Effect<
  SourceContentsSearchPage,
  InvalidInput | SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const request = yield* decodeReplayInput(input);
    const form = buildContentsSearchForm(request);
    const response = yield* fetchContentsSearchHtml(form);
    return yield* parseContentsSearchHtml(response, request);
  }).pipe(Effect.provide(FetchHttpClient.layer));
