import { describe, expect, test } from "bun:test";

import type { ViewReportResult } from "../../capabilities/view-report/contract.ts";
import { toViewReportCliResult } from "./view-report.ts";

const result = {
  result: {
    request: {
      receipt: "20260331004166",
      sectionId: "section:1",
      outputFormat: "markdown",
      maxBytes: 50_000,
      contentStartByte: 0,
    },
    receipt: { receiptNumber: "20260331004166" },
    document: { id: "doc:body", title: "사업보고서", kind: "body", selected: true },
    documents: [
      { id: "doc:body", title: "사업보고서", kind: "body", selected: true },
    ],
    toc: [
      {
        id: "section:1",
        title: "1. 회사의 개요",
        children: [
          {
            id: "section:1.1",
            title: "1.1 하위 항목",
            children: [
              { id: "section:1.1.1", title: "1.1.1 세부 항목", children: [] },
            ],
          },
        ],
      },
    ],
    content: {
      scope: "section",
      format: "markdown",
      body: "본문",
      sizeBytes: 6,
      returnedBytes: 6,
      isFullContent: true,
      window: {
        unit: "utf8-bytes",
        startByte: 0,
        endByte: 6,
        hasMore: false,
      },
      section: { id: "section:1", title: "1. 회사의 개요" },
    },
    navigation: { children: [] },
  },
  metadata: {
    fetchedAt: "2026-03-31T00:00:00.000Z",
    source: {
      system: "dart",
      surface: "dsaf001",
      endpoints: { shell: "https://dart.fss.or.kr/dsaf001/main.do" },
    },
    tocSource: "dart",
  },
  references: {
    viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
  },
  warnings: [],
} satisfies ViewReportResult;

describe("toViewReportCliResult", () => {
  test("omits locator fields from section output by default", () => {
    const compact = toViewReportCliResult(result, {
      pretty: false,
      verbose: false,
    });

    expect("documents" in compact.result).toBe(false);
    expect("toc" in compact.result).toBe(false);
    expect(compact.result.content?.body).toBe("본문");
    expect(compact.help).toContain(
      "Rerun with --toc-depth <number> when you need nearby TOC context.",
    );
  });

  test("keeps locator fields in verbose section output", () => {
    const verbose = toViewReportCliResult(result, {
      pretty: false,
      verbose: true,
    });

    expect("documents" in verbose.result).toBe(true);
    expect("toc" in verbose.result).toBe(true);
    if (!("documents" in verbose.result) || !("toc" in verbose.result)) {
      throw new Error("Expected verbose result to include locator fields.");
    }
    expect(verbose.result.documents).toEqual(result.result.documents);
    expect(verbose.result.toc).toEqual(result.result.toc);
    expect(verbose.help).toContain(
      "Rerun with --toc-depth <number> when you need nearby TOC context.",
    );
  });

  test("includes a bounded TOC when tocDepth is set", () => {
    const withToc = toViewReportCliResult(result, {
      pretty: false,
      verbose: false,
      tocDepth: 2,
    });

    expect("toc" in withToc.result).toBe(true);
    if (!("toc" in withToc.result) || withToc.result.toc === undefined) {
      throw new Error("Expected tocDepth result to include TOC.");
    }
    expect(withToc.result.toc[0]?.children[0]?.children).toEqual([]);
    expect(withToc.help).toContain(
      "Rerun with --toc-depth <number> when you need nearby TOC context.",
    );
  });

  test("returns continuation help when content is truncated", () => {
    const truncated = toViewReportCliResult(
      {
        ...result,
        result: {
          ...result.result,
          content: {
            ...result.result.content!,
            isFullContent: false,
            window: {
              unit: "utf8-bytes",
              startByte: 0,
              endByte: 6,
              hasMore: true,
              nextStartByte: 6,
            },
          },
        },
      },
      {
        pretty: false,
        verbose: false,
      },
    );

    expect(truncated.help[0]).toBe(
      "Continue content: darty view-report --receipt 20260331004166 --content-start-byte 6 --max-bytes 50000 --output-format markdown --section-id section:1",
    );
  });

  test("quotes URL receipts in continuation help", () => {
    const truncated = toViewReportCliResult(
      {
        ...result,
        result: {
          ...result.result,
          request: {
            ...result.result.request,
            receipt:
              "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
            documentId: "doc:body?x=1",
            sectionId: "section:1&x",
          },
          content: {
            ...result.result.content!,
            isFullContent: false,
            window: {
              unit: "utf8-bytes",
              startByte: 0,
              endByte: 6,
              hasMore: true,
              nextStartByte: 6,
            },
          },
        },
      },
      {
        pretty: false,
        verbose: false,
      },
    );

    expect(truncated.help[0]).toBe(
      "Continue content: darty view-report --receipt 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166' --content-start-byte 6 --max-bytes 50000 --output-format markdown --document-id 'doc:body?x=1' --section-id 'section:1&x'",
    );
  });
});
