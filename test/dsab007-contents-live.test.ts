import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import { searchDsab007Contents } from "../src/dart/dsab007/client.ts";

const liveTest = process.env.LIVE_DART_TESTS === "1" ? test : test.skip;

describe("searchDsab007Contents live against DART", () => {
  liveTest(
    "LIVE DART: populated contents search returns rows and still ignores caller maxResults",
    async () => {
      const result = await Effect.runPromise(
        searchDsab007Contents({
          option: "contents",
          currentPage: 1,
          maxResults: 3,
          maxLinks: 10,
          sort: "DATE",
          sortType: "desc",
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        }),
      );

      expect(result.request.maxResults).toBe(3);
      expect(result.pagination.totalCount).toBeGreaterThan(10);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.returnedCount).toBe(10);
      expect(result.rows).toHaveLength(10);
      expect(result.rows[0]?.rcpNo).toMatch(/^\d{14}$/);
      expect(result.rows[0]?.viewerUrl).toStartWith(
        "https://dart.fss.or.kr/dsaf001/main.do?",
      );
      expect(result.rows[0]?.receiptDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.rows[0]?.snippetText).toContain("배당");
    },
  );

  liveTest(
    "LIVE DART: no-result contents search returns zero rows for the observed empty fragment",
    async () => {
      const result = await Effect.runPromise(
        searchDsab007Contents({
          option: "contents",
          currentPage: 1,
          maxResults: 10,
          maxLinks: 10,
          sort: "DATE",
          sortType: "desc",
          keyword: "unlikelyzzzxq",
          startDate: "20250331",
          endDate: "20260331",
        }),
      );

      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.returnedCount).toBe(0);
      expect(result.rows).toHaveLength(0);
    },
  );
});
