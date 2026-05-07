import { describe, expect, test } from "bun:test";

import { defaultViewReportOperation } from "../../src/app/view-report.ts";

const liveTest = process.env.LIVE_DART_TESTS === "1" ? test : test.skip;

const sectionedReceiptNumber = "20260331004166";
const noTocReceiptNumber = "20260331904807";

describe("view-report live DART viewer probes", () => {
  liveTest("returns documents and TOC from the dsaf001 shell", async () => {
    const result = await defaultViewReportOperation.execute({
      receipt: sectionedReceiptNumber,
    });

    expect(result.result.receipt.receiptNumber).toBe(sectionedReceiptNumber);
    expect(result.result.document).toMatchObject({
      id: "document:body:1",
      kind: "body",
      selected: true,
    });
    expect(result.result.documents.length).toBeGreaterThan(0);
    expect(result.result.toc.length).toBeGreaterThan(0);
    expect(result.result.toc[0]?.id).toBe("section:1");
    expect(result.result.toc[0]?.title.replace(/\s+/g, "")).toContain(
      "사업보고서",
    );
    expect(result.result.content).toBeUndefined();
    expect(result.metadata.source.endpoints).toEqual({
      shell: "https://dart.fss.or.kr/dsaf001/main.do",
    });
    expect(result.references.viewerUrl).toBe(
      `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${sectionedReceiptNumber}`,
    );
    expect(result.warnings).toEqual([]);
  });

  liveTest("returns a selected TOC section from the report viewer iframe", async () => {
    const result = await defaultViewReportOperation.execute({
      receipt: sectionedReceiptNumber,
      sectionId: "section:1",
      maxBytes: 20_000,
    });

    expect(result.result.content).toMatchObject({
      scope: "section",
      format: "markdown",
      section: {
        id: "section:1",
      },
      truncated: false,
    });
    expect(result.result.content?.body).toContain("사 업 보 고 서");
    expect(result.result.content?.body).toContain("사업연도");
    expect(result.result.navigation?.next?.id).toBe("section:2");
    expect(result.metadata.source.endpoints).toEqual({
      shell: "https://dart.fss.or.kr/dsaf001/main.do",
      content: "https://dart.fss.or.kr/report/viewer.do",
    });
    expect(result.warnings).toEqual([]);
  });

  liveTest("returns no-TOC document content through the initial viewer locator", async () => {
    const result = await defaultViewReportOperation.execute({
      receipt: noTocReceiptNumber,
      maxBytes: 20_000,
    });

    expect(result.result.receipt.receiptNumber).toBe(noTocReceiptNumber);
    expect(result.result.toc).toEqual([]);
    expect(result.result.content).toMatchObject({
      scope: "document",
      format: "markdown",
      truncated: false,
    });
    expect(result.result.content?.body).toContain("정기주주총회 결과");
    expect(result.metadata.tocSource).toBe("none");
    expect(result.warnings).toEqual([
      {
        code: "no_toc_returned_document",
        message:
          "DART did not provide a table of contents for this document, so the selected document content was returned.",
      },
    ]);
  });
});
