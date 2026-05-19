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
        items: [{ code: "A001", label: "사업보고서" }],
      },
    ]);
  });

  test("searches by code or label", async () => {
    await expect(executeDisclosureTypes({ query: "I001" })).resolves.toMatchObject({
      result: {
        totalCount: 1,
        categories: [{ category: "I", items: [{ code: "I001", label: "수시공시" }] }],
      },
    });

    await expect(executeDisclosureTypes({ query: "수시" })).resolves.toMatchObject({
      result: {
        totalCount: 1,
        categories: [{ category: "I", items: [{ code: "I001", label: "수시공시" }] }],
      },
    });
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
