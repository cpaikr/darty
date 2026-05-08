import { describe, expect, test } from "bun:test";
import type { JsonSchema7Root } from "effect/JSONSchema";

import {
  searchCompanyReportsInputJsonSchema,
  searchCompanyReportsOperationName,
  searchCompanyReportsResultJsonSchema,
} from "./spec.ts";

describe("search-company-reports capability schemas", () => {
  test("exports operation identity and input schema", () => {
    const jsonSchema = searchCompanyReportsInputJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };

    expect(searchCompanyReportsOperationName).toBe("search-company-reports");
    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["companyCode", "startDate", "endDate"],
    });
    expect(jsonSchema.properties.companyCode?.pattern).toBe("^\\d{8}$");
    expect(jsonSchema.properties.pageSize).toMatchObject({
      enum: [15, 30, 50, 100],
      default: 15,
    });
    expect(jsonSchema.properties.sortDirection).toMatchObject({
      enum: ["asc", "desc"],
      default: "desc",
    });
    expect(jsonSchema.properties.includeAllReports).toMatchObject({
      type: "boolean",
      default: false,
    });
    expect(jsonSchema.properties.finalReportOnly).toBeUndefined();
    expect(jsonSchema.properties.sortBy).toBeUndefined();
    expect(jsonSchema.properties.companyName).toBeUndefined();
  });

  test("exports a success-only result schema", () => {
    expect(searchCompanyReportsResultJsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["result", "metadata", "references", "warnings"],
    });
  });
});
