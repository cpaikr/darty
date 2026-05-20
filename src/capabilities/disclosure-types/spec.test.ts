import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import type { JsonSchema7Root } from "effect/JSONSchema";

import { DisclosureTypesResultSchema } from "./contract.ts";
import {
  disclosureTypesInputJsonSchema,
  disclosureTypesOperationName,
  disclosureTypesResultJsonSchema,
} from "./spec.ts";

describe("disclosure-types capability schemas", () => {
  test("exports the shared operation identifier and input schema", () => {
    const jsonSchema = disclosureTypesInputJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };
    const category = jsonSchema.properties.category!;
    const query = jsonSchema.properties.query!;

    expect(disclosureTypesOperationName).toBe("disclosure-types");
    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: [],
    });
    expect(category).toMatchObject({
      type: "string",
      enum: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      examples: ["A", "I"],
    });
    expect(String(category.description)).toContain("A부터 J까지");
    expect(query).toMatchObject({
      type: "string",
      minLength: 1,
      examples: ["사업보고서", "A001"],
    });
    expect(String(query.description)).toContain("코드 또는 한국어 라벨");
    expect(jsonSchema.examples).toEqual([
      { category: "A" },
      { query: "사업보고서" },
      {},
    ]);
  });

  test("exports a success-only result schema for structured outputs", () => {
    const jsonSchema = disclosureTypesResultJsonSchema as JsonSchema7Root & {
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
    expect(jsonSchema.properties.error).toBeUndefined();
  });

  test("accepts a representative successful result envelope", async () => {
    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(DisclosureTypesResultSchema)({
        result: {
          request: {
            category: "A",
            query: "사업보고서",
          },
          totalCount: 1,
          categories: [
            {
              category: "A",
              categoryLabel: "정기공시",
              categoryDescription:
                "사업보고서, 반기보고서, 분기보고서 등 정기 제출 보고서 계열입니다.",
              items: [{ code: "A001", label: "사업보고서" }],
            },
          ],
        },
        metadata: {
          source: {
            system: "open-dart-docs",
            repository: "sjunepark/open-dart",
            commit: "85e7a07dee1d24cd810c705c1400c4ac3bbf6add",
            path: "src/docs/pblntf_detail_ty.md",
          },
          categoryLabelSource: {
            system: "dart-fss-docs",
            url: "https://dart-fss.readthedocs.io/en/latest/dart_types.html",
            codeSet: "pblntf_ty",
          },
          categoryDescriptionProvenance: {
            status: "implementation_authored_guidance",
            basis:
              "Human-authored summaries derived from pblntf_ty category labels and pblntf_detail_ty items.",
          },
          sourceBehavior: {
            codeSet: "pblntf_detail_ty",
            categoryCodeSet: "pblntf_ty",
            observationStatus: "source_material",
          },
          completeness: "complete",
        },
        references: {
          sourceUrl:
            "https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md",
        },
        warnings: [
          {
            code: "ambiguous_label_match",
            message: "같은 라벨이 여러 대분류에서 반환되어 category로 좁힐 수 있습니다.",
          },
        ],
      }),
    );

    expect(decoded.result.request).toEqual({
      category: "A",
      query: "사업보고서",
    });
    expect(decoded.result.categories).toEqual([
      {
        category: "A",
        categoryLabel: "정기공시",
        categoryDescription:
          "사업보고서, 반기보고서, 분기보고서 등 정기 제출 보고서 계열입니다.",
        items: [{ code: "A001", label: "사업보고서" }],
      },
    ]);
    expect(decoded.metadata.source.commit).toBe(
      "85e7a07dee1d24cd810c705c1400c4ac3bbf6add",
    );
    expect(decoded.references.sourceUrl).toContain("pblntf_detail_ty.md");
    expect(decoded.warnings).toHaveLength(1);
  });
});
