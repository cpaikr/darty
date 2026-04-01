import { describe, expect, test } from "bun:test";
import type { JsonSchema7Root } from "effect/JSONSchema";

import {
  contentsSearchInputJsonSchema,
  contentsSearchManifest,
} from "./spec.ts";

describe("contentsSearchManifest", () => {
  test("exports one transport-neutral input schema for future adapters", () => {
    const jsonSchema = contentsSearchInputJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };
    const page = jsonSchema.properties.page!;
    const sortBy = jsonSchema.properties.sortBy!;
    const startDate = jsonSchema.properties.startDate!;
    const endDate = jsonSchema.properties.endDate!;
    const keyword = jsonSchema.properties.keyword!;
    const companyCode = jsonSchema.properties.companyCode!;

    expect(contentsSearchManifest.inputProperties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "page",
          type: "integer",
          defaultValue: 1,
        }),
        expect.objectContaining({
          key: "sortBy",
          enumValues: ["date", "reportName"],
        }),
      ]),
    );
    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["keyword", "startDate", "endDate"],
    });

    expect(page).toMatchObject({
      type: "integer",
      description: "1-based search results page to request.",
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
    expect(companyCode.type).toBe("string");
    expect(jsonSchema.properties.maxResults).toBeUndefined();
    expect(jsonSchema.properties.textCrpNm).toBeUndefined();
  });

  test("stores examples as semantic inputs instead of CLI-only argv", () => {
    expect(contentsSearchManifest.examples).toEqual([
      {
        description: "Search recent contents matches for a keyword.",
        input: {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        },
      },
      {
        description:
          "Narrow results with observed company-code and presenter filters.",
        input: {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
          companyCode: "01368637",
          presenterName: "유일에너테크",
          sortBy: "reportName",
        },
      },
    ]);
  });
});
