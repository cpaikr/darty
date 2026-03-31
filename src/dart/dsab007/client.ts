import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

import {
  Dsab007ContentsSearchInput,
  type Dsab007ContentsSearchInput as Dsab007ContentsSearchInputType,
} from "./contracts.ts";
import { buildDsab007ContentsSearchForm } from "./request.ts";
import { parseDsab007ContentsSearchResponse } from "./parsers/contents.ts";
import { type Dsab007ContentsSearchResult } from "./models.ts";
import {
  InvalidInput,
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "../errors.ts";

export const dsab007SearchUrl = "https://dart.fss.or.kr/dsab007/search.ax";

const decodeQuery = (
  input: unknown,
): Effect.Effect<Dsab007ContentsSearchInputType, InvalidInput> =>
  Schema.decodeUnknown(Dsab007ContentsSearchInput)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidInput({
          message: ParseResult.TreeFormatter.formatIssueSync(error.issue),
        }),
    ),
  );

export const fetchDsab007SearchHtml = (
  form: URLSearchParams,
): Effect.Effect<
  string,
  SourceUnavailable | ParseFailure,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(dsab007SearchUrl).pipe(
      HttpClientRequest.setHeader(
        "content-type",
        "application/x-www-form-urlencoded; charset=UTF-8",
      ),
      HttpClientRequest.setHeader(
        "user-agent",
        "darty/0.1 (+https://dart.fss.or.kr)",
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
            sourceUrl: dsab007SearchUrl,
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
            sourceUrl: dsab007SearchUrl,
          }),
      ),
    );
  });

export const searchDsab007Contents = (
  input: unknown,
): Effect.Effect<
  Dsab007ContentsSearchResult,
  InvalidInput | SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const request = yield* decodeQuery(input);
    const form = buildDsab007ContentsSearchForm(request);
    const html = yield* fetchDsab007SearchHtml(form);
    return yield* parseDsab007ContentsSearchResponse(html, request, dsab007SearchUrl);
  }).pipe(Effect.provide(FetchHttpClient.layer));
