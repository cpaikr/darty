import { describe, expect, test } from "bun:test";
import { FetchHttpClient } from "@effect/platform";
import * as cheerio from "cheerio";
import { Effect } from "effect";

import {
  fetchContentsSearchHtml,
  searchContentsSourcePage,
} from "../../src/sources/dart/dsab007/contents/fetch.ts";
import {
  baselineContentsReplayInput,
  contentsReplayFieldContracts,
  type ContentsLiveExpectation,
  type ContentsLiveProbe,
} from "../../src/sources/dart/dsab007/contents/replay-contract/index.ts";
import type { SourceContentsReplayInput } from "../../src/sources/dart/dsab007/contents/replay-schema.ts";
import { buildContentsSearchForm } from "../../src/sources/dart/dsab007/contents/build-form.ts";

const liveTest = process.env.LIVE_DART_TESTS === "1" ? test : test.skip;

type BaselineSnapshot = {
  readonly request: SourceContentsReplayInput;
  readonly result: Awaited<ReturnType<typeof runSearch>>;
  readonly pagerAnchorTexts: readonly string[];
};

let baselineSnapshotPromise: Promise<BaselineSnapshot> | undefined;

const runSearch = async (
  input: SourceContentsReplayInput,
) => Effect.runPromise(searchContentsSourcePage(input));

const fetchPagerAnchorTexts = async (
  input: SourceContentsReplayInput,
): Promise<readonly string[]> => {
  const response = await Effect.runPromise(
    fetchContentsSearchHtml(
      buildContentsSearchForm(input),
    ).pipe(Effect.provide(FetchHttpClient.layer)),
  );
  const $ = cheerio.load(response.body);

  return $("#psWrap a")
    .map((_, element) => $(element).text().trim())
    .get();
};

const getBaselineSnapshot = async (): Promise<BaselineSnapshot> => {
  if (baselineSnapshotPromise === undefined) {
    baselineSnapshotPromise = (async () => {
      const result = await runSearch(baselineContentsReplayInput);
      const pagerAnchorTexts = await fetchPagerAnchorTexts(
        baselineContentsReplayInput,
      );

      return {
        request: baselineContentsReplayInput,
        result,
        pagerAnchorTexts,
      };
    })();
  }

  return baselineSnapshotPromise;
};

const expectProbeClassification = (
  probe: ContentsLiveProbe,
  expected: ContentsLiveProbe["classification"],
) => {
  expect(probe.classification).toBe(expected);
};

const assertExpectation = async (
  probe: ContentsLiveProbe,
  expectation: ContentsLiveExpectation,
  request: SourceContentsReplayInput,
  result: Awaited<ReturnType<typeof runSearch>>,
  baseline: BaselineSnapshot,
): Promise<void> => {
  switch (expectation.kind) {
    case "covered_by_baseline":
      expect(result.pagination.totalCount).toBeGreaterThan(0);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]?.viewerUrl).toStartWith(
        "https://dart.fss.or.kr/dsaf001/main.do?",
      );
      return;
    case "page_changes":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(result.pagination.currentPage).toBe(request.currentPage);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]?.rcpNo).not.toBe(baseline.result.rows[0]?.rcpNo);
      return;
    case "result_count_ignored":
      expectProbeClassification(probe, "accepted_but_ignored");
      expect(result.request.maxResults).toBe(request.maxResults);
      expect(result.pagination.returnedCount).toBe(10);
      expect(result.rows).toHaveLength(10);
      return;
    case "pager_width_ignored": {
      expectProbeClassification(probe, "accepted_but_ignored");
      const anchorTexts = await fetchPagerAnchorTexts(request);
      expect(anchorTexts).toEqual(baseline.pagerAnchorTexts);
      return;
    }
    case "sort_changes_order":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(result.request.sort).toBe("rpt_nm");
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]?.rcpNo).not.toBe(baseline.result.rows[0]?.rcpNo);
      return;
    case "sort_direction_changes_order":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(result.request.sortType).toBe("asc");
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]?.rcpNo).not.toBe(baseline.result.rows[0]?.rcpNo);
      return;
    case "no_results":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.returnedCount).toBe(0);
      expect(result.rows).toHaveLength(0);
      return;
    case "same_day_populated":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(result.request.startDate).toBe("20260331");
      expect(result.request.endDate).toBe("20260331");
      expect(result.pagination.totalCount).toBeGreaterThan(0);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.pagination.totalCount).toBeLessThan(
        baseline.result.pagination.totalCount,
      );
      return;
    case "reversed_range_empty":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(result.request.startDate).toBe("20260331");
      expect(result.request.endDate).toBe("20250331");
      expect(result.pagination.totalCount).toBe(0);
      expect(result.rows).toHaveLength(0);
      return;
    case "seeded_filter_honored": {
      expectProbeClassification(probe, "accepted_and_honored");
      const baselineRow = baseline.result.rows[0];
      expect(baselineRow).toBeDefined();
      expect(result.pagination.totalCount).toBeGreaterThan(0);
      expect(result.pagination.totalCount).toBeLessThan(
        baseline.result.pagination.totalCount,
      );

      if (expectation.field === "textCrpCik") {
        expect(request.textCrpCik).toBe(baselineRow?.corpCik);
        expect(result.rows[0]?.corpCik).toBe(request.textCrpCik);
      } else {
        expect(request.textPresenterNm).toBe(baselineRow?.presenterName);
        expect(result.rows[0]?.presenterName).toBe(request.textPresenterNm);
      }

      return;
    }
    case "seeded_filter_ignored":
      expectProbeClassification(probe, "accepted_but_ignored");
      expect(request.textCrpNm).toBe(expectation.ignoredValue);
      expect(result.pagination.totalCount).toBe(
        baseline.result.pagination.totalCount,
      );
      expect(result.rows[0]?.rcpNo).toBe(baseline.result.rows[0]?.rcpNo);
      return;
    case "fixed_filter_honored":
      expectProbeClassification(probe, "accepted_and_honored");
      expect(request.reportName).toBe(expectation.expectedValue);
      expect(result.pagination.totalCount).toBeGreaterThan(0);
      expect(result.pagination.totalCount).toBeLessThan(
        baseline.result.pagination.totalCount,
      );
      expect(
        result.rows.every((row) => row.reportTitle === expectation.expectedValue),
      ).toBe(true);
      return;
  }
};

describe("searchContents live DART replay probes", () => {
  for (const fieldContract of contentsReplayFieldContracts) {
    describe(fieldContract.key, () => {
      for (const probe of fieldContract.live) {
        liveTest(probe.name, async () => {
          const baseline = await getBaselineSnapshot();
          const request = probe.buildRequest({
            baseline: {
              request: baseline.request,
              result: baseline.result,
            },
          });
          const result = await runSearch(request);

          await assertExpectation(
            probe,
            probe.expectation,
            request,
            result,
            baseline,
          );
        });
      }
    });
  }
});
