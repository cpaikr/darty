import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import type { JsonSchema7Root } from "effect/JSONSchema";

import { ReportViewResultSchema } from "./contract.ts";
import {
  reportViewInputJsonSchema,
  reportViewOperationName,
  reportViewResultJsonSchema,
} from "./spec.ts";

describe("report-view capability schemas", () => {
  test("exports the shared operation identifier and input schema", () => {
    const jsonSchema = reportViewInputJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };
    const receipt = jsonSchema.properties.receipt!;
    const documentId = jsonSchema.properties.documentId!;
    const sectionId = jsonSchema.properties.sectionId!;
    const outputFormat = jsonSchema.properties.outputFormat!;
    const maxBytes = jsonSchema.properties.maxBytes!;

    expect(reportViewOperationName).toBe("report-view");
    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["receipt"],
    });
    expect(receipt).toMatchObject({
      type: "string",
      description: "DART 접수번호 또는 /dsaf001/main.do?rcpNo=... viewer URL.",
    });
    expect(documentId.type).toBe("string");
    expect(sectionId.type).toBe("string");
    expect(outputFormat).toMatchObject({
      type: "string",
      enum: ["html"],
      default: "html",
    });
    expect(maxBytes).toMatchObject({
      type: "integer",
      default: 200000,
      minimum: 1000,
      maximum: 1000000,
    });
  });

  test("exports a success-only result schema for structured outputs", () => {
    const jsonSchema = reportViewResultJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
      $defs?: Record<string, unknown>;
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
    expect(jsonSchema.$defs?.ReportViewTocNode).toMatchObject({
      type: "object",
      required: ["id", "title", "children"],
    });
  });

  test("accepts the existing successful result envelope", async () => {
    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(ReportViewResultSchema)({
        result: {
          request: {
            receipt: "20260331004166",
            documentId: undefined,
            sectionId: "section:1",
            outputFormat: "html",
            maxBytes: 200000,
          },
          receipt: {
            receiptNumber: "20260331004166",
          },
          document: {
            id: "document:body:1",
            title: "사업보고서",
            kind: "body",
            selected: true,
          },
          documents: [
            {
              id: "document:body:1",
              title: "사업보고서",
              kind: "body",
              selected: true,
            },
          ],
          toc: [
            {
              id: "section:1",
              title: "사 업 보 고 서",
              children: [],
            },
          ],
          content: {
            scope: "section",
            format: "html",
            html: "<p>본문</p>",
            sizeBytes: 13,
            returnedBytes: 13,
            truncated: false,
            section: {
              id: "section:1",
              title: "사 업 보 고 서",
            },
          },
          navigation: {
            previous: undefined,
            next: undefined,
            parent: undefined,
            children: [],
          },
        },
        metadata: {
          fetchedAt: "2026-05-05T00:00:00.000Z",
          source: {
            system: "dart",
            surface: "dsaf001",
            endpoints: {
              shell: "https://dart.fss.or.kr/dsaf001/main.do",
              content: "https://dart.fss.or.kr/report/viewer.do",
            },
          },
          tocSource: "dart",
          outputFormat: "html",
        },
        references: {
          viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
        },
        warnings: [],
      }),
    );

    expect(decoded.result.request.receipt).toBe("20260331004166");
    expect(decoded.result.toc[0]?.children).toEqual([]);
    expect(decoded.result.content?.section?.id).toBe("section:1");
  });
});
