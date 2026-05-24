import { describe, expect, test } from "bun:test";

import {
  SearchBodyFailure,
  resolveSearchBodyRequest,
} from "./contract.ts";
import { executeSearchBody } from "./execute.ts";
import { SearchBodyProviderError } from "./provider.ts";

describe("executeSearchBody", () => {
  test("resolves public input, executes the provider, and returns a capability-owned result", async () => {
    let receivedRequest:
      | ReturnType<typeof resolveSearchBodyRequest>
      | undefined;

    const result = await executeSearchBody(
      {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        page: 2,
        sortBy: "reportName",
        companyCode: "01368637",
      },
      {
        search: async (request) => {
          receivedRequest = request;

          return {
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
            references: {
              searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
            },
            warnings: [],
          };
        },
      },
    );

    expect(receivedRequest).toEqual({
      page: 2,
      sortBy: "reportName",
      sortDirection: "desc",
      detail: "concise",
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
      companyCode: "01368637",
    });
    expect(result).toEqual({
      result: {
        request: {
          page: 2,
          sortBy: "reportName",
          sortDirection: "desc",
          detail: "concise",
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
          companyCode: "01368637",
        },
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
      references: {
        searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
      },
      warnings: [],
    });
  });

  test("preserves source locator fields when detailed output is requested", async () => {
    const result = await executeSearchBody(
      {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        detail: "detailed",
      },
      {
        search: async (request) => ({
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            returnedCount: 1,
          },
          items: [
            {
              company: {
                name: "유일에너테크",
                companyCode: "01368637",
              },
              filing: {
                receiptNumber: "20260331904807",
                documentNumber: "11216440",
                reportTitle: "정기주주총회결과",
                receiptDate: "2026-03-31",
              },
              match: {
                snippetText: "배당",
              },
              references: {
                viewerUrl:
                  "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807&dcmNo=11216440",
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
          references: {
            searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
          },
          warnings: [],
        }),
      },
    );

    expect(result.result.items[0]?.filing.documentNumber).toBe("11216440");
    expect(result.result.items[0]?.evidence?.snippetHtml).toBe(
      "<strong>배당</strong>",
    );
  });

  test("adds an evidence-backed warning for no-result searches", async () => {
    const result = await executeSearchBody(
      {
        keyword: "없는검색어",
        startDate: "20250101",
        endDate: "20251231",
        reportName: "사업보고서",
      },
      {
        search: async () => ({
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            returnedCount: 0,
          },
          items: [],
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
          references: {
            searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
          },
          warnings: [],
        }),
      },
    );

    expect(result.warnings).toEqual([
      {
        code: "no_results",
        message:
          "No DART 본문내용 results. DART applies document-level keywords plus explicit date/company/report filters; widen the date range or remove optional filters, then search again.",
      },
    ]);
  });

  test("preserves provider-owned partial-result warnings", async () => {
    const request = resolveSearchBodyRequest({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
    });

    const result = await executeSearchBody(request, {
      search: async () => ({
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 3,
          returnedCount: 2,
        },
        items: [],
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
          completeness: "partial",
          droppedItemCount: 1,
        },
        references: {
          searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
        },
        warnings: [
          {
            code: "partial_rows_dropped",
            message:
              "Dropped 1 search result row(s) because they could not be parsed.",
            droppedItemCount: 1,
          },
        ],
      }),
    });

    expect(result.metadata.completeness).toBe("partial");
    expect(result.metadata.droppedItemCount).toBe(1);
    expect(result.warnings).toEqual([
      {
        code: "partial_rows_dropped",
        message: "Dropped 1 search result row(s) because they could not be parsed.",
        droppedItemCount: 1,
      },
    ]);
  });

  test("adds recovery hints for bad date windows and unsupported limit", async () => {
    for (const [input, parameter, expectedHintParts] of [
      [
        {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20250101",
        },
        "startDate",
        ["YYYYMMDD", "startDate cannot be after endDate"],
      ],
      [
        {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
          limit: 20,
        },
        "limit",
        [
          "limit is not supported",
          "cannot control pageSize",
          "pageSize (15, 30, 50, 100)",
        ],
      ],
    ] as const) {
      try {
        await executeSearchBody(input, {
          search: async () => {
            throw new Error("provider should not be called for invalid requests");
          },
        });
        throw new Error("Expected search-body execution to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(SearchBodyFailure);

        if (!(error instanceof SearchBodyFailure)) {
          throw error;
        }

        expect(error.code).toBe("invalid_request");
        expect(error.parameter).toBe(parameter);

        for (const expectedHintPart of expectedHintParts) {
          expect(error.recoveryHint).toContain(expectedHintPart);
        }
      }
    }
  });

  test("maps source failures into capability-owned structured errors", async () => {
    await expect(
      executeSearchBody(
        resolveSearchBodyRequest({
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        }),
        {
          search: async () => {
            throw new SearchBodyProviderError({
              code: "source_unavailable",
              message: "Failed to reach DART search.",
              retryable: true,
              providerId: "test-provider",
              sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
            });
          },
        },
      ),
    ).rejects.toMatchObject({
      code: "source_unavailable",
      retryable: true,
      sourceUrl: "https://dart.fss.or.kr/dsab007/search.ax",
    });
  });

  test("classifies unexpected provider failures as internal errors", async () => {
    await expect(
      executeSearchBody(
        resolveSearchBodyRequest({
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        }),
        {
          search: async () => {
            throw new Error("Unexpected mapping bug.");
          },
        },
      ),
    ).rejects.toEqual(
      new SearchBodyFailure({
        code: "internal_error",
        message: "Unexpected internal error while searching filing bodies.",
        retryable: false,
      }),
    );
  });
});
