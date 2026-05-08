import { describe, expect, test } from "bun:test";

import type { SearchBodyResult } from "../../capabilities/search-body/contract.ts";
import type { SearchCompanyReportsResult } from "../../capabilities/search-company-reports/contract.ts";
import type { SearchCompanyResult } from "../../capabilities/search-company/contract.ts";
import {
  toSearchBodyCliResult,
  toSearchCompanyCliResult,
  toSearchCompanyReportsCliResult,
} from "./search.ts";

const companyResult = {
  result: {
    request: { page: 1, pageSize: 15, companyName: "삼성전자" },
    pagination: { currentPage: 1, totalPages: 1, totalCount: 1, returnedCount: 1 },
    items: [
      {
        companyCode: "00126380",
        companyName: "삼성전자",
        marketKind: "kospi",
        references: {
          detailEndpoint: "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380",
        },
        evidence: { rawCompanyLinkHref: "javascript:select('00126380');" },
      },
    ],
  },
  metadata: {
    fetchedAt: "2026-05-07T00:00:00.000Z",
    source: {
      system: "dart",
      surface: "dsae001",
      endpoint: "https://dart.fss.or.kr/dsae001/search.ax",
    },
    sourceBehavior: {
      searchMode: "company",
      callerControlsPageSize: true,
      maxObservedPageSize: 45,
      observationStatus: "observed",
    },
    completeness: "complete",
    droppedItemCount: 0,
  },
  references: { searchUrl: "https://dart.fss.or.kr/dsae001/search.ax" },
  warnings: [],
} satisfies SearchCompanyResult;

const bodyResult = {
  result: {
    request: {
      page: 1,
      sortBy: "date",
      sortDirection: "desc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
    },
    pagination: { currentPage: 1, totalPages: 1, totalCount: 1, returnedCount: 1 },
    items: [
      {
        company: { name: "삼성전자" },
        filing: {
          receiptNumber: "20260331004166",
          reportTitle: "사업보고서",
          receiptDate: "20260331",
        },
        match: { snippetText: "배당 관련 내용" },
        references: {
          viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
        },
        evidence: {
          reportNameRaw: "사업보고서",
          rawInfoText: "[정기공시] 본문 제출인 : 삼성전자",
          snippetHtml: "<span>배당</span> 관련 내용",
        },
      },
    ],
  },
  metadata: {
    fetchedAt: "2026-03-31T00:00:00.000Z",
    source: {
      system: "dart",
      surface: "dsab007",
      endpoint: "https://dart.fss.or.kr/dsab007/search.ax",
    },
    sourceBehavior: {
      effectivePageSize: 10,
      effectivePagerWidth: 10,
      callerControlsPageSize: false,
      callerControlsPagerWidth: false,
      observationStatus: "observed",
    },
    completeness: "complete",
    droppedItemCount: 0,
  },
  references: { searchUrl: "https://dart.fss.or.kr/dsab007/search.ax" },
  warnings: [],
} satisfies SearchBodyResult;

const companyReportsResult = {
  result: {
    request: {
      companyCode: "00126380",
      startDate: "20250331",
      endDate: "20260331",
      page: 1,
      pageSize: 15,
      sortDirection: "desc",
      disclosureTypes: [],
      industryCode: "all",
      corporationType: "all",
      closingAccountsMonth: "all",
      includeAllReports: false,
    },
    company: { companyCode: "00126380", name: "삼성전자" },
    pagination: { currentPage: 1, totalPages: 1, totalCount: 1, returnedCount: 1 },
    items: [
      {
        company: { companyCode: "00126380", name: "삼성전자" },
        filing: {
          receiptNumber: "20260331004166",
          reportTitle: "사업보고서",
          receiptDate: "20260331",
        },
        references: {
          viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
        },
        remarks: [],
        evidence: { rawRowText: "삼성전자 사업보고서" },
      },
    ],
  },
  metadata: {
    fetchedAt: "2026-03-31T00:00:00.000Z",
    source: {
      system: "dart",
      surface: "dsab007",
      endpoint: "https://dart.fss.or.kr/dsab007/search.ax",
    },
    sourceBehavior: {
      searchMode: "corp",
      sortBy: "date",
      callerControlsPageSize: true,
      pageSizeChoices: [15, 30, 50, 100],
      finalReportDefault: true,
      observationStatus: "observed",
    },
    completeness: "complete",
    droppedItemCount: 0,
  },
  references: { searchUrl: "https://dart.fss.or.kr/dsab007/search.ax" },
  warnings: [],
} satisfies SearchCompanyReportsResult;

describe("search CLI presentation", () => {
  test("omits item evidence from compact search-company output", () => {
    const compact = toSearchCompanyCliResult(companyResult, {
      pretty: false,
      verbose: false,
    });

    expect("evidence" in compact.result.items[0]!).toBe(false);
  });

  test("omits item evidence from compact search-body output", () => {
    const compact = toSearchBodyCliResult(bodyResult, {
      pretty: false,
      verbose: false,
    });

    expect("evidence" in compact.result.items[0]!).toBe(false);
  });

  test("omits item evidence from compact search-company-reports output", () => {
    const compact = toSearchCompanyReportsCliResult(companyReportsResult, {
      pretty: false,
      verbose: false,
    });

    expect("evidence" in compact.result.items[0]!).toBe(false);
  });

  test("keeps full capability results in verbose output", () => {
    expect(
      toSearchCompanyCliResult(companyResult, { pretty: false, verbose: true }),
    ).toBe(companyResult);
    expect(toSearchBodyCliResult(bodyResult, { pretty: false, verbose: true })).toBe(
      bodyResult,
    );
    expect(
      toSearchCompanyReportsCliResult(companyReportsResult, {
        pretty: false,
        verbose: true,
      }),
    ).toBe(companyReportsResult);
  });
});
