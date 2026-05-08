import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import { searchCompanyReportsSourcePage } from "../../src/sources/dart/dsab007/company-reports/fetch.ts";
import type { SourceCompanyReportsReplayInput } from "../../src/sources/dart/dsab007/company-reports/replay-schema.ts";

const liveTest = process.env.LIVE_DART_TESTS === "1" ? test : test.skip;

const baselineCompanyReportsReplayInput = {
  option: "corp",
  currentPage: 1,
  maxResults: 15,
  maxLinks: 10,
  sort: "date",
  series: "desc",
  textCrpCik: "00190321",
  startDate: "20250507",
  endDate: "20260507",
  finalReportOnly: true,
} as const satisfies SourceCompanyReportsReplayInput;

describe("searchCompanyReports live DART replay probes", () => {
  liveTest("replays selected company-code filing search without popup automation", async () => {
    const result = await Effect.runPromise(
      searchCompanyReportsSourcePage(baselineCompanyReportsReplayInput),
    );

    expect(result.company).toMatchObject({
      companyCode: "00190321",
      name: "케이티",
    });
    expect(result.pagination.totalCount).toBeGreaterThan(0);
    expect(result.pagination.returnedCount).toBe(15);
    expect(result.rows[0]?.companyCode).toBe("00190321");
    expect(result.rows[0]?.viewerUrl).toStartWith(
      "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=",
    );
  });
});
