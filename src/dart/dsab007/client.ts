import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

import {
  ContentsSearchInput,
  type ContentsSearchInput as ContentsSearchInputType,
} from "./contracts.ts";
import { buildContentsSearchForm } from "./request.ts";
import { parseContentsSearchResponse } from "./parsers/contents.ts";
import { type ContentsSearchResult } from "./models.ts";
import {
  InvalidInput,
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../errors.ts";

export const searchUrl = "https://dart.fss.or.kr/dsab007/search.ax";
const chromeDesktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const decodeQuery = (
  input: unknown,
): Effect.Effect<ContentsSearchInputType, InvalidInput> =>
  Schema.decodeUnknown(ContentsSearchInput)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidInput({
          message: ParseResult.TreeFormatter.formatIssueSync(error.issue),
        }),
    ),
  );

/**
 * Executes the observed `dsab007/search.ax` form replay and returns the raw
 * HTML fragment DART uses to render the result table.
 *
 * Transport failures and body decoding failures are narrowed here so the parser
 * can treat the response body as the only remaining source of change.
 */
export const fetchSearchHtml = (
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
      HttpClientRequest.setHeader(
        "user-agent",
        chromeDesktopUserAgent,
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
            message:
              error instanceof Error ? error.message : "Failed to reach DART search.",
            sourceUrl: searchUrl,
          }),
      ),
    );

    return yield* response.text.pipe(
      Effect.mapError(
        (error) =>
          new ParseFailure({
            message:
              error instanceof Error
                ? error.message
                : "Failed to decode DART search HTML.",
            sourceUrl: searchUrl,
          }),
      ),
    );
  });

/**
 * Validates a DART-shaped contents request, executes the `dsab007` replay, and
 * parses the returned HTML fragment into the current contents-mode model.
 *
 * This is intentionally mode-specific at the parser layer and shared at the
 * transport layer so additional `dsab007` modes can reuse the same client seam.
 */
export const searchContents = (
  input: unknown,
): Effect.Effect<
  ContentsSearchResult,
  InvalidInput | SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const request = yield* decodeQuery(input);
    const form = buildContentsSearchForm(request);
    const html = yield* fetchSearchHtml(form);
    return yield* parseContentsSearchResponse(html, request, searchUrl);
  }).pipe(Effect.provide(FetchHttpClient.layer));
