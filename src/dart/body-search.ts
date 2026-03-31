import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

import { parseBodySearchResponse } from "./body-search-parser.ts";
import { BodySearchQuery, type BodySearchResult } from "./body-search-schema.ts";
import {
  InvalidInput,
  ParseFailure,
  SourceChanged,
  SourceUnavailable,
} from "./errors.ts";

const searchUrl = "https://dart.fss.or.kr/dsab007/search.ax";

const encodeSort = (sort: "date" | "reportName"): { sort: string; sortType: string } =>
  sort === "date"
    ? { sort: "DATE", sortType: "desc" }
    : { sort: "rpt_nm", sortType: "desc" };

const buildRequestBody = (query: Schema.Schema.Type<typeof BodySearchQuery>): URLSearchParams => {
  const sort = encodeSort(query.sort);
  const params = new URLSearchParams();

  params.set("currentPage", String(query.page));
  params.set("maxResults", "10");
  params.set("maxLinks", "10");
  params.set("sort", sort.sort);
  params.set("sortType", sort.sortType);
  params.set("textCrpCik", query.companyId ?? "");
  params.set("lateKeyword", "");
  params.set("flrCik", "");
  params.set("dspTypeTab", "");
  params.set("isSort", "false");
  params.set("isTab", "false");
  params.set("tocSrch", "");
  params.set("b_textCrpCik", query.companyId ?? "");
  params.set("b_flrCik", "");
  params.set("b_keyword", query.query);
  params.set("b_docType", "");
  params.set("b_textPresenterNm", query.presenterName ?? "");
  params.set("b_reportName", "");
  params.set("b_startDate", query.startDate);
  params.set("b_endDate", query.endDate);
  params.set("b_dspType", "");
  params.set("b_synonym", "");
  params.set("b_reSearch", "");
  params.set("reportNamePopYn", "");
  params.set("autoSearch", "N");
  params.set("option", "contents");
  params.set("keyword", query.query);
  params.set("textCrpNm", query.companyName ?? "");
  params.set("textPresenterNm", query.presenterName ?? "");
  params.set("startDate", query.startDate);
  params.set("endDate", query.endDate);
  params.set("decadeType", "");
  params.set("docType", "");
  params.set("reportName", "");

  return params;
};

const decodeQuery = (
  input: unknown,
): Effect.Effect<Schema.Schema.Type<typeof BodySearchQuery>, InvalidInput> =>
  Schema.decodeUnknown(BodySearchQuery)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidInput({
          message: ParseResult.TreeFormatter.formatIssueSync(error.issue),
        }),
    ),
  );

const fetchSearchHtml = (
  query: Schema.Schema.Type<typeof BodySearchQuery>,
): Effect.Effect<
  string,
  SourceUnavailable | ParseFailure,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const body = buildRequestBody(query).toString();
    const request = HttpClientRequest.post(searchUrl).pipe(
      HttpClientRequest.setHeader(
        "content-type",
        "application/x-www-form-urlencoded; charset=UTF-8",
      ),
      HttpClientRequest.setHeader(
        "user-agent",
        "darty/0.1 (+https://dart.fss.or.kr)",
      ),
      HttpClientRequest.bodyText(
        body,
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

export const searchFilingBodies = (
  input: unknown,
): Effect.Effect<
  BodySearchResult,
  InvalidInput | SourceUnavailable | SourceChanged | ParseFailure
> =>
  Effect.gen(function* () {
    const query = yield* decodeQuery(input);
    const html = yield* fetchSearchHtml(query);
    return yield* parseBodySearchResponse(html, query, searchUrl);
  }).pipe(Effect.provide(FetchHttpClient.layer));
