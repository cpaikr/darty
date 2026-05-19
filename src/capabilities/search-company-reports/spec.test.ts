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
    expect(jsonSchema.properties.companyCode?.examples).toEqual(["00126380"]);
    expect(jsonSchema.examples).toMatchObject([
      {
        companyCode: "00126380",
        reportName: "사업보고서",
      },
    ]);
    expect(jsonSchema.properties.pageSize).toMatchObject({
      enum: [15, 30, 50, 100],
      default: 15,
    });
    expect(jsonSchema.properties.sortDirection).toMatchObject({
      enum: ["asc", "desc"],
      default: "desc",
    });
    expect(jsonSchema.properties.presenterName).toMatchObject({ minLength: 1 });
    expect(jsonSchema.properties.reportName).toMatchObject({ minLength: 1 });
    expect(jsonSchema.properties.disclosureTypes).toMatchObject({
      type: "array",
      default: [],
    });
    expect(jsonSchema.properties.disclosureTypes?.description).toContain("A001");
    expect(jsonSchema.properties.disclosureTypes?.description).toContain("reportName");
    expect(jsonSchema.properties.disclosureTypes?.items).toMatchObject({
      pattern: "^[A-J]\\d{3}$",
    });
    expect(jsonSchema.properties.industryCode).toMatchObject({
      pattern: "^(all|ROOT\\d{4}|\\d{2,5})$",
      default: "all",
    });
    expect(jsonSchema.properties.industryCode?.description).toContain("612");
    expect(jsonSchema.properties.corporationType).toMatchObject({
      enum: ["all", "P", "A", "N", "E"],
      default: "all",
    });
    expect(jsonSchema.properties.corporationType?.description).toContain("P(유가증권시장)");
    expect(jsonSchema.properties.closingAccountsMonth).toMatchObject({
      enum: ["all", "12", "11", "10", "09", "08", "07", "06", "05", "04", "03", "02", "01"],
      default: "all",
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
    const jsonSchema = searchCompanyReportsResultJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, any>>;
    };

    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["result", "metadata", "references", "warnings"],
    });
    const result = jsonSchema.properties.result as Record<string, any>;

    expect(
      result.properties.items.items.properties.filing.properties.receiptNumber
        .description,
    ).toContain("rcpNo");
    expect(
      result.properties.items.items.properties.references.properties.viewerUrl
        .description,
    ).toContain("view-report");

    const matchedDisclosureType =
      result.properties.items.items.properties.matchedDisclosureType;
    expect(matchedDisclosureType).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["code", "category", "categoryLabel", "evidence"],
    });
    expect(matchedDisclosureType.properties.code).toMatchObject({
      pattern: "^[A-J]\\d{3}$",
    });
    expect(matchedDisclosureType.properties.evidence.properties.source).toMatchObject({
      enum: ["single_disclosure_type_request"],
    });

    const warnings = jsonSchema.properties.warnings as Record<string, any>;
    const warningVariants = warnings.items.anyOf;
    expect(warningVariants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          required: ["code", "message", "droppedItemCount"],
          properties: expect.objectContaining({
            code: expect.objectContaining({ enum: ["partial_rows_dropped"] }),
            droppedItemCount: expect.objectContaining({ minimum: 0 }),
          }),
        }),
        expect.objectContaining({
          required: ["code", "message"],
          properties: expect.objectContaining({
            code: expect.objectContaining({
              enum: ["matched_disclosure_type_unavailable"],
            }),
          }),
        }),
      ]),
    );
  });
});
