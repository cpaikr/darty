import type { SourceContentsReplayInput } from "./replay-schema.ts";
import type { SourceContentsSearchPage } from "./source-model.ts";

/**
 * Internal replay probes for the low-level DART-shaped contents contract.
 *
 * These fixtures and live expectations document what the upstream source
 * accepts and honors today. They are not the public semantic operation
 * contract exposed to tools.
 */
export const baselineContentsReplayInput = {
  option: "contents",
  currentPage: 1,
  maxResults: 10,
  maxLinks: 10,
  sort: "DATE",
  sortType: "desc",
  keyword: "배당",
  startDate: "20250331",
  endDate: "20260331",
} as const satisfies SourceContentsReplayInput;

export type ContentsReplayField =
  | "option"
  | "currentPage"
  | "maxResults"
  | "maxLinks"
  | "sort"
  | "sortType"
  | "keyword"
  | "startDate"
  | "endDate"
  | "textCrpCik"
  | "textCrpNm"
  | "textPresenterNm"
  | "reportName";

export type ContentsLiveClassification =
  | "accepted_and_honored"
  | "accepted_but_ignored"
  | "accepted_parse_only";

export type ContentsLocalCase = {
  readonly name: string;
  readonly input: unknown;
};

export type ContentsSerializationCase = {
  readonly name: string;
  readonly input: SourceContentsReplayInput;
  readonly expectedEntries: Readonly<Record<string, string>>;
};

type LiveProbeBaselineContext = {
  readonly request: SourceContentsReplayInput;
  readonly result: SourceContentsSearchPage;
};

export type LiveProbeContext = {
  readonly baseline: LiveProbeBaselineContext;
};

export type ContentsLiveExpectation =
  | { readonly kind: "covered_by_baseline" }
  | { readonly kind: "page_changes" }
  | { readonly kind: "result_count_ignored" }
  | { readonly kind: "pager_width_ignored" }
  | { readonly kind: "sort_changes_order" }
  | { readonly kind: "sort_direction_changes_order" }
  | { readonly kind: "no_results" }
  | { readonly kind: "same_day_populated" }
  | { readonly kind: "reversed_range_empty" }
  | {
      readonly kind: "seeded_filter_honored";
      readonly field: "textCrpCik" | "textPresenterNm";
    }
  | {
      readonly kind: "seeded_filter_ignored";
      readonly field: "textCrpNm";
      readonly ignoredValue: string;
    }
  | {
      readonly kind: "fixed_filter_honored";
      readonly field: "reportName";
      readonly expectedValue: string;
    };

export type ContentsLiveProbe = {
  readonly name: string;
  readonly classification: ContentsLiveClassification;
  readonly expectation: ContentsLiveExpectation;
  readonly buildRequest: (
    context: LiveProbeContext,
  ) => SourceContentsReplayInput;
};

export type ContentsReplayFieldContract = {
  readonly key: ContentsReplayField;
  readonly accepts: readonly ContentsLocalCase[];
  readonly rejects: readonly ContentsLocalCase[];
  readonly serialization: readonly ContentsSerializationCase[];
  readonly live: readonly ContentsLiveProbe[];
};

