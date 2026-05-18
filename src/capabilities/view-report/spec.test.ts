import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import type { JsonSchema7Root } from "effect/JSONSchema";

import { ViewReportResultSchema } from "./contract.ts";
import {
  viewReportInputJsonSchema,
  viewReportOperationName,
  viewReportResultJsonSchema,
} from "./spec.ts";

const makeResultEnvelopeWithWindow = (window: unknown): unknown => ({
  result: {
    request: {
      receipt: "20260331004166",
      documentId: undefined,
      sectionId: "section:1",
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
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
    documents: [],
    toc: [],
    content: {
      scope: "section",
      format: "html",
      body: "본문",
      sizeBytes: 6,
      returnedBytes: 6,
      isFullContent: true,
      window,
      section: {
        id: "section:1",
        title: "사 업 보 고 서",
      },
    },
    navigation: undefined,
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
  },
  references: {
    viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
  },
  warnings: [],
});

describe("view-report capability schemas", () => {
  test("exports the shared operation identifier and input schema", () => {
    const jsonSchema = viewReportInputJsonSchema as JsonSchema7Root & {
      type: "object";
      properties: Record<string, Record<string, unknown>>;
    };
    const receipt = jsonSchema.properties.receipt!;
    const documentId = jsonSchema.properties.documentId!;
    const sectionId = jsonSchema.properties.sectionId!;
    const outputFormat = jsonSchema.properties.outputFormat!;
    const maxBytes = jsonSchema.properties.maxBytes!;
    const contentStartByte = jsonSchema.properties.contentStartByte!;

    expect(viewReportOperationName).toBe("view-report");
    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["receipt"],
    });
    expect(receipt).toMatchObject({
      type: "string",
      description:
        "14자리 DART 접수번호 또는 rcpNo가 포함된 /dsaf001/main.do viewer URL. URL의 dcmNo는 내부 문서 선택에만 사용되며 별도 입력으로 받지 않습니다.",
    });
    expect(documentId).toMatchObject({
      type: "string",
      description:
        "이전 view-report 응답의 documents[].id 값. DART dcmNo가 아니며, 생략하면 선택된 기본 본문 문서를 사용합니다.",
    });
    expect(sectionId).toMatchObject({
      type: "string",
      description:
        "같은 receipt/documentId의 이전 view-report 응답에서 받은 toc[].id 값. DART eleId/offset이 아니며, 연도·정정·다른 접수번호에 재사용하지 마세요.",
    });
    expect(outputFormat).toMatchObject({
      type: "string",
      enum: ["html", "markdown"],
      default: "markdown",
    });
    expect(maxBytes).toMatchObject({
      type: "integer",
      default: 50000,
      minimum: 1000,
      maximum: 1000000,
    });
    expect(contentStartByte).toMatchObject({
      type: "integer",
      default: 0,
      minimum: 0,
    });
  });

  test("exports a success-only result schema for structured outputs", () => {
    const jsonSchema = viewReportResultJsonSchema as JsonSchema7Root & {
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

    const resultSchema = jsonSchema.properties.result as {
      properties: Record<string, unknown>;
    };
    const receiptSchema = resultSchema.properties.receipt as {
      properties: Record<string, unknown>;
    };
    const documentSchema = resultSchema.properties.document as {
      properties: Record<string, unknown>;
    };
    const referencesSchema = jsonSchema.properties.references as {
      properties: Record<string, unknown>;
    };
    const tocDefinition = jsonSchema.$defs?.ViewReportTocNode as {
      properties: Record<string, unknown>;
    };

    expect(receiptSchema.properties.receiptNumber).toMatchObject({
      description: "14자리 DART 접수번호(rcpNo).",
    });
    expect(documentSchema.properties.id).toMatchObject({
      description:
        "darty가 반환한 문서 ID. 후속 view-report documentId로 사용하며 DART dcmNo가 아닙니다.",
    });
    expect(referencesSchema.properties.viewerUrl).toMatchObject({
      description:
        "DART /dsaf001/main.do?rcpNo=... viewer URL. 후속 view-report receipt로 사용할 수 있습니다.",
    });
    expect(tocDefinition).toMatchObject({
      type: "object",
      required: ["id", "title", "children"],
    });
    expect(tocDefinition.properties.id).toMatchObject({
      description:
        "darty가 반환한 목차 섹션 ID. 같은 receipt/documentId의 후속 view-report sectionId로만 사용하세요.",
    });
  });

  test("accepts an html result envelope", async () => {
    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(ViewReportResultSchema)({
        result: {
          request: {
            receipt: "20260331004166",
            documentId: undefined,
            sectionId: "section:1",
            outputFormat: "html",
            maxBytes: 200000,
            contentStartByte: 0,
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
            body: "<p>본문</p>",
            sizeBytes: 13,
            returnedBytes: 13,
            isFullContent: true,
            window: {
              unit: "utf8-bytes",
              startByte: 0,
              endByte: 13,
              hasMore: false,
            },
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

  test("accepts markdown content in the result envelope", async () => {
    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(ViewReportResultSchema)({
        result: {
          request: {
            receipt: "20260331004166",
            documentId: undefined,
            sectionId: "section:1",
            outputFormat: "markdown",
            maxBytes: 200000,
            contentStartByte: 0,
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
          documents: [],
          toc: [],
          content: {
            scope: "section",
            format: "markdown",
            body: "# 본문",
            sizeBytes: 8,
            returnedBytes: 8,
            isFullContent: true,
            window: {
              unit: "utf8-bytes",
              startByte: 0,
              endByte: 8,
              hasMore: false,
            },
            section: {
              id: "section:1",
              title: "사 업 보 고 서",
            },
          },
          navigation: undefined,
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
        },
        references: {
          viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
        },
        warnings: [],
      }),
    );

    expect(decoded.result.content?.format).toBe("markdown");
    expect(decoded.result.content?.body).toBe("# 본문");
  });

  test("requires a next content byte only when more content remains", async () => {
    await expect(
      Effect.runPromise(
        Schema.decodeUnknown(ViewReportResultSchema)(
          makeResultEnvelopeWithWindow({
            unit: "utf8-bytes",
            startByte: 0,
            endByte: 6,
            hasMore: true,
            nextStartByte: 6,
          }),
        ),
      ),
    ).resolves.toBeDefined();

    await expect(
      Effect.runPromise(
        Schema.decodeUnknown(ViewReportResultSchema)(
          makeResultEnvelopeWithWindow({
            unit: "utf8-bytes",
            startByte: 0,
            endByte: 6,
            hasMore: true,
          }),
        ),
      ),
    ).rejects.toThrow();
  });
});
