import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import type { JsonSchema7Root } from "effect/JSONSchema";

import {
  SearchBodyResultSchema,
  resolveSearchBodyRequest,
} from "./contract.ts";
import {
  searchBodyInputJsonSchema,
  searchBodyOperationName,
  searchBodyResultJsonSchema,
} from "./spec.ts";

describe("search-body capability schemas", () => {
  test("exports the shared operation identifier and input schema", () => {
    const jsonSchema = searchBodyInputJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };
    const page = jsonSchema.properties.page!;
    const sortBy = jsonSchema.properties.sortBy!;
    const startDate = jsonSchema.properties.startDate!;
    const endDate = jsonSchema.properties.endDate!;
    const keyword = jsonSchema.properties.keyword!;
    const companyCode = jsonSchema.properties.companyCode!;

    expect(searchBodyOperationName).toBe("search-body");
    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["keyword", "startDate", "endDate"],
    });

    expect(page).toMatchObject({
      type: "integer",
      description: "[default: 1] DART search result page, starting at 1.",
      default: 1,
      minimum: 1,
      maximum: 100,
    });
    expect(sortBy).toMatchObject({
      type: "string",
      enum: ["date", "reportName"],
      default: "date",
    });
    expect(startDate.pattern).toBe("^\\d{8}$");
    expect(endDate.pattern).toBe("^\\d{8}$");
    expect(keyword.type).toBe("string");
    expect(keyword.examples).toEqual(["배당", "사과|포도"]);
    const keywordDescription = String(keyword.description);
    expect(keywordDescription).toContain("사과|포도");
    expect(keywordDescription).toContain("사과포도");
    expect(jsonSchema.examples).toEqual([
      {
        page: 1,
        sortBy: "date",
        sortDirection: "desc",
        detail: "concise",
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: "00126380",
      },
    ]);
    expect(companyCode.type).toBe("string");
    expect(companyCode.pattern).toBe("^\\d{8}$");
    expect(String(companyCode.description)).toContain(
      "Free-text company names and 6-digit stock codes are not accepted",
    );
    expect(jsonSchema.properties.maxResults).toBeUndefined();
    expect(jsonSchema.properties.textCrpNm).toBeUndefined();
  });

  test("exports a success-only result schema for structured outputs", () => {
    const jsonSchema = searchBodyResultJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };

    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["result", "metadata", "references", "warnings"],
    });
    expect(jsonSchema.properties.result).toBeDefined();
    expect(jsonSchema.properties.metadata).toBeDefined();
    expect(jsonSchema.properties.references).toBeDefined();
    expect(jsonSchema.properties.warnings).toBeDefined();
    expect(
      String(
        (jsonSchema.properties.result as Record<string, any>).properties.items.items
          .properties.filing.properties.receiptNumber.description,
      ),
    ).toContain("rcpNo");
    expect(
      (jsonSchema.properties.result as Record<string, any>).properties.items.items
        .properties.references.properties.viewerUrl.description,
    ).toContain("report-viewer URL");
    expect(jsonSchema.properties.error).toBeUndefined();
  });

  test("accepts the existing successful result envelope", async () => {
    const request = resolveSearchBodyRequest({
      keyword: "배당",
      startDate: "20250331",
      endDate: "20260331",
    });

    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(SearchBodyResultSchema)({
        result: {
          request,
          pagination: {
            currentPage: 1,
            totalPages: 2,
            totalCount: 11,
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
      }),
    );

    expect(decoded.result.request).toEqual({ ...request, detail: "concise" });
    expect(decoded.result.items).toHaveLength(1);
  });
});
