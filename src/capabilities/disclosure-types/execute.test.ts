import { describe, expect, test } from "bun:test";

import { DisclosureTypesFailure } from "./contract.ts";
import { executeDisclosureTypes } from "./execute.ts";

describe("executeDisclosureTypes", () => {
  test("returns the full static disclosure-type menu by default", async () => {
    const result = await executeDisclosureTypes({});

    expect(result.result.request).toEqual({});
    expect(result.result.totalCount).toBe(60);
    expect(result.result.categories).toHaveLength(10);
    expect(result.result.categories[0]).toEqual({
      category: "A",
      categoryLabel: "정기공시",
      categoryDescription:
        "사업보고서, 반기보고서, 분기보고서 등 정기 제출 보고서 계열입니다.",
      items: [
        { code: "A001", label: "사업보고서" },
        { code: "A002", label: "반기보고서" },
        { code: "A003", label: "분기보고서" },
        { code: "A004", label: "등록법인결산서류(자본시장법이전)" },
        { code: "A005", label: "소액공모법인결산서류" },
      ],
    });
    expect(result.metadata.source).toMatchObject({
      system: "open-dart-docs",
      repository: "sjunepark/open-dart",
      commit: "85e7a07dee1d24cd810c705c1400c4ac3bbf6add",
      path: "src/docs/pblntf_detail_ty.md",
    });
    expect(result.references.sourceUrl).toContain("pblntf_detail_ty.md");
  });

  test("filters by category and query", async () => {
    const result = await executeDisclosureTypes({
      category: "a",
      query: "사업보고서",
    } as Record<string, unknown>);

    expect(result.result.request).toEqual({
      category: "A",
      query: "사업보고서",
    });
    expect(result.result.totalCount).toBe(1);
    expect(result.result.categories).toEqual([
      {
        category: "A",
        categoryLabel: "정기공시",
        categoryDescription:
          "사업보고서, 반기보고서, 분기보고서 등 정기 제출 보고서 계열입니다.",
        items: [{ code: "A001", label: "사업보고서" }],
      },
    ]);
  });

  test("searches by code or label", async () => {
    await expect(executeDisclosureTypes({ query: "I001" })).resolves.toMatchObject({
      result: {
        totalCount: 1,
        categories: [
          {
            category: "I",
            categoryLabel: "거래소공시",
            items: [{ code: "I001", label: "수시공시" }],
          },
        ],
      },
    });

    await expect(executeDisclosureTypes({ query: "수시" })).resolves.toMatchObject({
      result: {
        totalCount: 1,
        categories: [
          {
            category: "I",
            categoryLabel: "거래소공시",
            items: [{ code: "I001", label: "수시공시" }],
          },
        ],
      },
    });
  });

  test("warns when a query returns duplicate labels across categories", async () => {
    const result = await executeDisclosureTypes({ query: "주요사항보고서" });

    expect(result.result.categories).toMatchObject([
      {
        category: "B",
        categoryLabel: "주요사항보고",
        items: [{ code: "B001", label: "주요사항보고서" }],
      },
      {
        category: "H",
        categoryLabel: "자산유동화",
        items: [{ code: "H006", label: "주요사항보고서" }],
      },
    ]);
    expect(result.warnings).toEqual([
      {
        code: "ambiguous_label_match",
        message:
          '검색어 "주요사항보고서"에 같은 라벨("주요사항보고서")을 가진 상세 코드가 여러 대분류에서 반환되었습니다: B001(B=주요사항보고), H006(H=자산유동화). 대분류 라벨을 확인하거나 category/--category로 좁히세요.',
      },
    ]);
  });

  test("returns an empty successful result when filters match nothing", async () => {
    const result = await executeDisclosureTypes({ query: "없는공시" });

    expect(result.result.totalCount).toBe(0);
    expect(result.result.categories).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("rejects invalid request fields", async () => {
    await expect(
      executeDisclosureTypes({ category: "Z" } as Record<string, unknown>),
    ).rejects.toThrow(DisclosureTypesFailure);
    await expect(executeDisclosureTypes({ query: "   " })).rejects.toMatchObject({
      code: "invalid_request",
      parameter: "query",
    });
    await expect(executeDisclosureTypes({ extra: true })).rejects.toMatchObject({
      code: "invalid_request",
      parameter: "extra",
    });
  });
});
