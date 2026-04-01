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

type LiveProbeContext = {
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
  readonly observedStatus: "observed";
  readonly accepts: readonly ContentsLocalCase[];
  readonly rejects: readonly ContentsLocalCase[];
  readonly serialization: readonly ContentsSerializationCase[];
  readonly live: readonly ContentsLiveProbe[];
};

const withInput = (
  overrides: Partial<SourceContentsReplayInput>,
): SourceContentsReplayInput => ({
  ...baselineContentsReplayInput,
  ...overrides,
});

const withUnknownInput = (
  overrides: Record<string, unknown>,
): Record<string, unknown> => ({
  ...baselineContentsReplayInput,
  ...overrides,
});

const buildSerializationCase = (
  name: string,
  overrides: Partial<SourceContentsReplayInput>,
  expectedEntries: Readonly<Record<string, string>>,
): ContentsSerializationCase => ({
  name,
  input: withInput(overrides),
  expectedEntries,
});

const buildLiveRequestProbe = (
  name: string,
  classification: ContentsLiveClassification,
  expectation: ContentsLiveExpectation,
  overrides: Partial<SourceContentsReplayInput>,
): ContentsLiveProbe => ({
  name,
  classification,
  expectation,
  buildRequest: () => withInput(overrides),
});

const getRequiredBaselineRow = (
  context: LiveProbeContext,
): SourceContentsSearchPage["rows"][number] => {
  const row = context.baseline.result.rows[0];
  if (row === undefined) {
    throw new Error("Baseline live probe returned no rows.");
  }

  return row;
};

export const contentsReplayFields = [
  "option",
  "currentPage",
  "maxResults",
  "maxLinks",
  "sort",
  "sortType",
  "keyword",
  "startDate",
  "endDate",
  "textCrpCik",
  "textCrpNm",
  "textPresenterNm",
  "reportName",
] as const satisfies readonly ContentsReplayField[];

export const contentsReplayFieldContracts = [
  {
    key: "option",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts contents",
        input: withInput({ option: "contents" }),
      },
    ],
    rejects: [
      {
        name: "rejects other mode literals",
        input: withUnknownInput({ option: "corp" }),
      },
      {
        name: "rejects non-string option",
        input: withUnknownInput({ option: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes option", {}, { option: "contents" }),
    ],
    live: [
      buildLiveRequestProbe(
        "baseline populated search covers option=contents",
        "accepted_and_honored",
        { kind: "covered_by_baseline" },
        {},
      ),
    ],
  },
  {
    key: "currentPage",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts first page",
        input: withInput({ currentPage: 1 }),
      },
      {
        name: "accepts later pages",
        input: withInput({ currentPage: 2 }),
      },
    ],
    rejects: [
      {
        name: "rejects page zero",
        input: withUnknownInput({ currentPage: 0 }),
      },
      {
        name: "rejects negative pages",
        input: withUnknownInput({ currentPage: -1 }),
      },
      {
        name: "rejects floating point pages",
        input: withUnknownInput({ currentPage: 1.5 }),
      },
      {
        name: "rejects string pages",
        input: withUnknownInput({ currentPage: "2" }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes currentPage", { currentPage: 2 }, {
        currentPage: "2",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "page 2 changes the returned page",
        "accepted_and_honored",
        { kind: "page_changes" },
        { currentPage: 2 },
      ),
    ],
  },
  {
    key: "maxResults",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts lower bound",
        input: withInput({ maxResults: 1 }),
      },
      {
        name: "accepts upper bound",
        input: withInput({ maxResults: 100 }),
      },
    ],
    rejects: [
      {
        name: "rejects zero",
        input: withUnknownInput({ maxResults: 0 }),
      },
      {
        name: "rejects values above 100",
        input: withUnknownInput({ maxResults: 101 }),
      },
      {
        name: "rejects floating point values",
        input: withUnknownInput({ maxResults: 1.5 }),
      },
      {
        name: "rejects string values",
        input: withUnknownInput({ maxResults: "10" }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes lower bound", { maxResults: 1 }, {
        maxResults: "1",
      }),
      buildSerializationCase("serializes upper bound", { maxResults: 100 }, {
        maxResults: "100",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "maxResults=1 is accepted but ignored upstream",
        "accepted_but_ignored",
        { kind: "result_count_ignored" },
        { maxResults: 1 },
      ),
      buildLiveRequestProbe(
        "maxResults=3 is accepted but ignored upstream",
        "accepted_but_ignored",
        { kind: "result_count_ignored" },
        { maxResults: 3 },
      ),
      buildLiveRequestProbe(
        "maxResults=10 is accepted and matches the current upstream page size",
        "accepted_but_ignored",
        { kind: "result_count_ignored" },
        { maxResults: 10 },
      ),
      buildLiveRequestProbe(
        "maxResults=100 is accepted but ignored upstream",
        "accepted_but_ignored",
        { kind: "result_count_ignored" },
        { maxResults: 100 },
      ),
    ],
  },
  {
    key: "maxLinks",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts lower bound",
        input: withInput({ maxLinks: 1 }),
      },
      {
        name: "accepts upper bound",
        input: withInput({ maxLinks: 100 }),
      },
    ],
    rejects: [
      {
        name: "rejects zero",
        input: withUnknownInput({ maxLinks: 0 }),
      },
      {
        name: "rejects values above 100",
        input: withUnknownInput({ maxLinks: 101 }),
      },
      {
        name: "rejects floating point values",
        input: withUnknownInput({ maxLinks: 1.5 }),
      },
      {
        name: "rejects string values",
        input: withUnknownInput({ maxLinks: "10" }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes lower bound", { maxLinks: 1 }, {
        maxLinks: "1",
      }),
      buildSerializationCase("serializes upper bound", { maxLinks: 100 }, {
        maxLinks: "100",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "maxLinks=1 is accepted but ignored upstream",
        "accepted_but_ignored",
        { kind: "pager_width_ignored" },
        { maxLinks: 1 },
      ),
      buildLiveRequestProbe(
        "maxLinks=10 is accepted but ignored upstream",
        "accepted_but_ignored",
        { kind: "pager_width_ignored" },
        { maxLinks: 10 },
      ),
      buildLiveRequestProbe(
        "maxLinks=100 is accepted but ignored upstream",
        "accepted_but_ignored",
        { kind: "pager_width_ignored" },
        { maxLinks: 100 },
      ),
    ],
  },
  {
    key: "sort",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts DATE",
        input: withInput({ sort: "DATE" }),
      },
      {
        name: "accepts rpt_nm",
        input: withInput({ sort: "rpt_nm" }),
      },
    ],
    rejects: [
      {
        name: "rejects unsupported sort fields",
        input: withUnknownInput({ sort: "corp" }),
      },
      {
        name: "rejects non-string sort fields",
        input: withUnknownInput({ sort: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes DATE", { sort: "DATE" }, {
        sort: "DATE",
      }),
      buildSerializationCase("serializes rpt_nm", { sort: "rpt_nm" }, {
        sort: "rpt_nm",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "sort=rpt_nm changes the first result ordering",
        "accepted_and_honored",
        { kind: "sort_changes_order" },
        { sort: "rpt_nm" },
      ),
    ],
  },
  {
    key: "sortType",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts desc",
        input: withInput({ sortType: "desc" }),
      },
      {
        name: "accepts asc",
        input: withInput({ sortType: "asc" }),
      },
    ],
    rejects: [
      {
        name: "rejects unsupported directions",
        input: withUnknownInput({ sortType: "down" }),
      },
      {
        name: "rejects non-string directions",
        input: withUnknownInput({ sortType: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes desc", { sortType: "desc" }, {
        sortType: "desc",
      }),
      buildSerializationCase("serializes asc", { sortType: "asc" }, {
        sortType: "asc",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "sortType=asc changes the first result ordering",
        "accepted_and_honored",
        { kind: "sort_direction_changes_order" },
        { sortType: "asc" },
      ),
    ],
  },
  {
    key: "keyword",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts a populated keyword",
        input: withInput({ keyword: "배당" }),
      },
      {
        name: "accepts another populated keyword",
        input: withInput({ keyword: "주주" }),
      },
    ],
    rejects: [
      {
        name: "rejects empty strings",
        input: withUnknownInput({ keyword: "" }),
      },
      {
        name: "rejects non-string keywords",
        input: withUnknownInput({ keyword: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes keyword into both fields", {}, {
        keyword: "배당",
        b_keyword: "배당",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "unlikely keyword returns the observed empty fragment",
        "accepted_and_honored",
        { kind: "no_results" },
        { keyword: "unlikelyzzzxq" },
      ),
    ],
  },
  {
    key: "startDate",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts same-day lower bound formatting",
        input: withInput({ startDate: "20250331" }),
      },
      {
        name: "accepts another valid date",
        input: withInput({ startDate: "20260331" }),
      },
    ],
    rejects: [
      {
        name: "rejects hyphenated dates",
        input: withUnknownInput({ startDate: "2025-03-31" }),
      },
      {
        name: "rejects underspecified dates",
        input: withUnknownInput({ startDate: "202503" }),
      },
      {
        name: "rejects non-string dates",
        input: withUnknownInput({ startDate: 20250331 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes startDate into both fields", {}, {
        startDate: "20250331",
        b_startDate: "20250331",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "same-day startDate still returns populated results",
        "accepted_and_honored",
        { kind: "same_day_populated" },
        { startDate: "20260331", endDate: "20260331" },
      ),
    ],
  },
  {
    key: "endDate",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts valid end dates",
        input: withInput({ endDate: "20260331" }),
      },
      {
        name: "accepts another valid date",
        input: withInput({ endDate: "20250401" }),
      },
    ],
    rejects: [
      {
        name: "rejects slash-separated dates",
        input: withUnknownInput({ endDate: "2026/03/31" }),
      },
      {
        name: "rejects underspecified dates",
        input: withUnknownInput({ endDate: "202603" }),
      },
      {
        name: "rejects non-string dates",
        input: withUnknownInput({ endDate: 20260331 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes endDate into both fields", {}, {
        endDate: "20260331",
        b_endDate: "20260331",
      }),
    ],
    live: [
      buildLiveRequestProbe(
        "reversed date ranges return an empty result set",
        "accepted_and_honored",
        { kind: "reversed_range_empty" },
        { startDate: "20260331", endDate: "20250331" },
      ),
    ],
  },
  {
    key: "textCrpCik",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts a populated company code",
        input: withInput({ textCrpCik: "00310156" }),
      },
    ],
    rejects: [
      {
        name: "rejects empty company codes",
        input: withUnknownInput({ textCrpCik: "" }),
      },
      {
        name: "rejects non-string company codes",
        input: withUnknownInput({ textCrpCik: 310156 }),
      },
    ],
    serialization: [
      buildSerializationCase(
        "serializes textCrpCik into current and duplicated fields",
        { textCrpCik: "00310156" },
        {
          textCrpCik: "00310156",
          b_textCrpCik: "00310156",
        },
      ),
      buildSerializationCase("serializes omitted textCrpCik as empty strings", {}, {
        textCrpCik: "",
        b_textCrpCik: "",
      }),
    ],
    live: [
      {
        name: "textCrpCik narrows the result set to the seeded company code",
        classification: "accepted_and_honored",
        expectation: {
          kind: "seeded_filter_honored",
          field: "textCrpCik",
        },
        buildRequest: (context: LiveProbeContext) => {
          const row = getRequiredBaselineRow(context);
          if (row.corpCik === undefined) {
            throw new Error("Baseline row is missing corpCik for textCrpCik probe.");
          }

          return withInput({ textCrpCik: row.corpCik });
        },
      },
    ],
  },
  {
    key: "textCrpNm",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts a populated company name",
        input: withInput({ textCrpNm: "셀루메드" }),
      },
    ],
    rejects: [
      {
        name: "rejects empty company names",
        input: withUnknownInput({ textCrpNm: "" }),
      },
      {
        name: "rejects non-string company names",
        input: withUnknownInput({ textCrpNm: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase("serializes textCrpNm", { textCrpNm: "셀루메드" }, {
        textCrpNm: "셀루메드",
      }),
      buildSerializationCase("serializes omitted textCrpNm as an empty string", {}, {
        textCrpNm: "",
      }),
    ],
    live: [
      {
        name: "textCrpNm is accepted but ignored for unlikely company names",
        classification: "accepted_but_ignored",
        expectation: {
          kind: "seeded_filter_ignored",
          field: "textCrpNm",
          ignoredValue: "unlikelyzzzxq",
        },
        buildRequest: () => withInput({ textCrpNm: "unlikelyzzzxq" }),
      },
    ],
  },
  {
    key: "textPresenterNm",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts a populated presenter name",
        input: withInput({ textPresenterNm: "셀루메드" }),
      },
    ],
    rejects: [
      {
        name: "rejects empty presenter names",
        input: withUnknownInput({ textPresenterNm: "" }),
      },
      {
        name: "rejects non-string presenter names",
        input: withUnknownInput({ textPresenterNm: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase(
        "serializes textPresenterNm into current and duplicated fields",
        { textPresenterNm: "셀루메드" },
        {
          textPresenterNm: "셀루메드",
          b_textPresenterNm: "셀루메드",
        },
      ),
      buildSerializationCase(
        "serializes omitted textPresenterNm as empty strings",
        {},
        {
          textPresenterNm: "",
          b_textPresenterNm: "",
        },
      ),
    ],
    live: [
      {
        name: "textPresenterNm narrows the result set to the seeded presenter",
        classification: "accepted_and_honored",
        expectation: {
          kind: "seeded_filter_honored",
          field: "textPresenterNm",
        },
        buildRequest: (context: LiveProbeContext) => {
          const row = getRequiredBaselineRow(context);
          if (row.presenterName === undefined) {
            throw new Error(
              "Baseline row is missing presenterName for textPresenterNm probe.",
            );
          }

          return withInput({ textPresenterNm: row.presenterName });
        },
      },
    ],
  },
  {
    key: "reportName",
    observedStatus: "observed",
    accepts: [
      {
        name: "accepts a populated report name",
        input: withInput({ reportName: "정기주주총회결과" }),
      },
    ],
    rejects: [
      {
        name: "rejects empty report names",
        input: withUnknownInput({ reportName: "" }),
      },
      {
        name: "rejects non-string report names",
        input: withUnknownInput({ reportName: 1 }),
      },
    ],
    serialization: [
      buildSerializationCase(
        "serializes reportName into current and duplicated fields",
        { reportName: "정기주주총회결과" },
        {
          reportName: "정기주주총회결과",
          b_reportName: "정기주주총회결과",
        },
      ),
      buildSerializationCase("serializes omitted reportName as empty strings", {}, {
        reportName: "",
        b_reportName: "",
      }),
    ],
    live: [
      {
        name: "reportName narrows the result set to matching report titles",
        classification: "accepted_and_honored",
        expectation: {
          kind: "fixed_filter_honored",
          field: "reportName",
          expectedValue: "정기주주총회결과",
        },
        buildRequest: () => withInput({ reportName: "정기주주총회결과" }),
      },
    ],
  },
] as const satisfies readonly ContentsReplayFieldContract[];
