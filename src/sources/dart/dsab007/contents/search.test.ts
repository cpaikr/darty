import { describe, expect, test } from "bun:test";

import { ParseFailure, SourceUnavailable } from "../../errors.ts";
import {
  observedContentsSearchBehavior,
  toDsab007ContentsProviderError,
  toDsab007ContentsProviderResult,
  toDsab007ContentsReplayInput,
} from "./search.ts";

describe("toDsab007ContentsReplayInput", () => {
  test("maps the adapter-facing request into the internal DART replay contract", () => {
    expect(
      toDsab007ContentsReplayInput({
        page: 2,
        sortBy: "reportName",
        sortDirection: "asc",
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: "01368637",
        presenterName: "IR",
        reportName: "정기주주총회결과",
      }),
    ).toEqual({
      option: "contents",
      currentPage: 2,
      maxResults: observedContentsSearchBehavior.effectivePageSize,
      maxLinks: observedContentsSearchBehavior.effectivePagerWidth,
      sort: "rpt_nm",
      sortType: "asc",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      textCrpCik: "01368637",
      textCrpNm: undefined,
      textPresenterNm: "IR",
      lateKeyword: undefined,
      flrCik: undefined,
      dspTypeTab: undefined,
      tocSrch: undefined,
      docType: undefined,
      reportName: "정기주주총회결과",
      decadeType: undefined,
    });
  });
});

describe("toDsab007ContentsProviderResult", () => {
  test("maps the parsed source page into the capability-owned provider result", () => {
    expect(
      toDsab007ContentsProviderResult({
        request: {
          option: "contents",
          currentPage: 2,
          maxResults: 10,
          maxLinks: 10,
          sort: "rpt_nm",
          sortType: "asc",
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
          textCrpCik: "01368637",
          textCrpNm: undefined,
          textPresenterNm: "IR",
          lateKeyword: undefined,
          flrCik: undefined,
          dspTypeTab: undefined,
          tocSrch: undefined,
          docType: undefined,
          reportName: "정기주주총회결과",
          decadeType: undefined,
        },
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalCount: 21,
          returnedCount: 1,
        },
        rows: [
          {
            companyName: "유일에너테크",
            companyMarketLabel: "코스닥시장",
            corpCik: "01368637",
            reportNameRaw: "정기주주총회결과",
            reportModifier: undefined,
            reportTitle: "정기주주총회결과",
            reportPeriod: undefined,
            reportNameSuffix: undefined,
            rcpNo: "20260331904807",
            dcmNo: "11216440",
            snippetHtml: "<strong>배당</strong>",
            snippetText: "배당",
            disclosureTypeLabel: "거래소공시",
            contentTypeLabel: "본문",
            presenterName: "유일에너테크",
            rawInfoText: "[거래소공시] [본문] 제출인 : 유일에너테크",
            viewerPath: "/dsaf001/main.do?rcpNo=20260331904807",
            viewerUrl:
              "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
            receiptDate: "2026-03-31",
          },
        ],
        warnings: [
          {
            code: "row_parse_failed",
            rowIndex: 3,
            message: "Missing filing viewer link in search result row.",
          },
        ],
        droppedRowCount: 1,
        fetchedAt: "2026-03-31T00:00:00.000Z",
        sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
      }),
    ).toEqual({
      pagination: {
        currentPage: 2,
        totalPages: 3,
        totalCount: 21,
        returnedCount: 1,
      },
      items: [
        {
          company: {
            name: "유일에너테크",
            marketLabel: "코스닥시장",
            companyCode: "01368637",
          },
          filing: {
            receiptNumber: "20260331904807",
            documentNumber: "11216440",
            reportTitle: "정기주주총회결과",
            reportModifier: undefined,
            reportPeriod: undefined,
            reportNameSuffix: undefined,
            receiptDate: "2026-03-31",
          },
          match: {
            snippetText: "배당",
            disclosureTypeLabel: "거래소공시",
            contentTypeLabel: "본문",
            presenterName: "유일에너테크",
          },
          references: {
            viewerUrl:
              "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
          },
          evidence: {
            reportNameRaw: "정기주주총회결과",
            rawInfoText: "[거래소공시] [본문] 제출인 : 유일에너테크",
            snippetHtml: "<strong>배당</strong>",
          },
        },
      ],
      metadata: {
        fetchedAt: "2026-03-31T00:00:00.000Z",
        source: {
          system: "dart",
          surface: "dsab007",
          endpoint: "https://dart.fss.or.kr/dsab007/search.ax",
        },
        sourceBehavior: observedContentsSearchBehavior,
        completeness: "partial",
        droppedItemCount: 1,
      },
      references: {
        searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
      },
      warnings: [
        {
          code: "partial_rows_dropped",
          message: "1 search result row(s) could not be parsed and were omitted.",
          droppedItemCount: 1,
        },
      ],
    });
  });
});

describe("toDsab007ContentsProviderError", () => {
  test("normalizes retryable source failures at the provider boundary", () => {
    expect(
      toDsab007ContentsProviderError(
        new SourceUnavailable({
          message: "Failed to reach DART search.",
          sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
        }),
      ),
    ).toMatchObject({
      code: "source_unavailable",
      retryable: true,
      providerId: "dart-dsab007-contents",
      sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
    });
  });

  test("normalizes unexpected provider bugs without mislabeling them as source failures", () => {
    expect(
      toDsab007ContentsProviderError(
        new ParseFailure({
          message: "Parsed DART response did not match the expected source schema.",
          sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
        }),
      ),
    ).toMatchObject({
      code: "source_parse_failure",
      retryable: false,
      providerId: "dart-dsab007-contents",
      sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
    });

    expect(
      toDsab007ContentsProviderError(new Error("Unexpected mapper bug.")),
    ).toMatchObject({
      code: "internal_provider_error",
      retryable: false,
      providerId: "dart-dsab007-contents",
    });
  });
});
