import { describe, expect, test } from "bun:test";

import { ViewReportProviderError } from "../../../../capabilities/view-report/provider.ts";
import {
  createDsaf001ViewReportProvider,
  type Dsaf001ReportSource,
} from "./view.ts";
import type {
  SourceReportLocator,
  SourceReportShell,
} from "./source-model.ts";

const receiptNumber = "20260331004166";

const rootLocator = {
  rcpNo: receiptNumber,
  dcmNo: "11213016",
  eleId: "1",
  offset: "100",
  length: "900",
  dtd: "dart4.xsd",
};

const childLocator = {
  rcpNo: receiptNumber,
  dcmNo: "11213016",
  eleId: "2",
  offset: "200",
  length: "300",
  dtd: "dart4.xsd",
};

const siblingLocator = {
  rcpNo: receiptNumber,
  dcmNo: "11213016",
  eleId: "3",
  offset: "500",
  length: "300",
  dtd: "dart4.xsd",
};

const bodyDocument = {
  id: "document:body:1",
  title: "사업보고서",
  kind: "body" as const,
  selected: true,
  query: `rcpNo=${receiptNumber}`,
};

const attachmentDocument = {
  id: "document:attachment:1",
  title: "감사보고서",
  kind: "attachment" as const,
  selected: false,
  query: `rcpNo=${receiptNumber}&dcmNo=11213015`,
};

const createTocShell = (
  overrides?: Partial<SourceReportShell>,
): SourceReportShell => ({
  receiptNumber,
  sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNumber}`,
  documents: [bodyDocument, attachmentDocument],
  selectedDocument: bodyDocument,
  toc: [
    {
      id: "section:1",
      title: "사 업 보 고 서",
      locator: rootLocator,
      children: [
        {
          id: "section:1.1",
          title: "배당에 관한 사항",
          locator: childLocator,
          children: [],
        },
        {
          id: "section:1.2",
          title: "임원 및 직원 등에 관한 사항",
          locator: siblingLocator,
          children: [],
        },
      ],
    },
  ],
  initialViewLocator: rootLocator,
  ...overrides,
});

const createNoTocShell = (): SourceReportShell => ({
  receiptNumber: "20260331904807",
  sourceUrl:
    "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
  documents: [
    {
      id: "document:body:1",
      title: "정기주주총회결과",
      kind: "body" as const,
      selected: true,
      query: "rcpNo=20260331904807",
    },
  ],
  selectedDocument: {
    id: "document:body:1",
    title: "정기주주총회결과",
    kind: "body" as const,
    selected: true,
    query: "rcpNo=20260331904807",
  },
  toc: [],
  initialViewLocator: {
    rcpNo: "20260331904807",
    dcmNo: "11216440",
    eleId: "0",
    offset: "0",
    length: "0",
    dtd: "HTML",
  },
});

type FakeSourceControls = {
  readonly shellForQuery?: (query: string | undefined) => SourceReportShell;
  readonly contentHtml?: string;
};

const createFakeSource = (controls?: FakeSourceControls) => {
  const shellQueries: (string | undefined)[] = [];
  const contentLocators: SourceReportLocator[] = [];
  const source: Dsaf001ReportSource = {
    endpoints: {
      shell: "https://dart.fss.or.kr/dsaf001/main.do",
      content: "https://dart.fss.or.kr/report/viewer.do",
    },
    fetchShell: async (_receiptNumber, documentQuery) => {
      shellQueries.push(documentQuery);

      return controls?.shellForQuery?.(documentQuery) ?? createTocShell();
    },
    fetchContent: async (locator) => {
      contentLocators.push(locator);

      return {
        sourceUrl: "https://dart.fss.or.kr/report/viewer.do?hidden=params",
        html: controls?.contentHtml ?? "<div>content</div>",
      };
    },
  };

  return {
    source,
    shellQueries,
    contentLocators,
  };
};

describe("createDsaf001ViewReportProvider", () => {
  test("returns TOC-only reports without fetching iframe content", async () => {
    const fake = createFakeSource();
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
    });

    expect(fake.shellQueries).toEqual([undefined]);
    expect(fake.contentLocators).toEqual([]);
    expect(result.content).toBeUndefined();
    expect(result.metadata.source.endpoints).toEqual({
      shell: "https://dart.fss.or.kr/dsaf001/main.do",
    });
    expect(result.toc).toEqual([
      {
        id: "section:1",
        title: "사 업 보 고 서",
        children: [
          {
            id: "section:1.1",
            title: "배당에 관한 사항",
            children: [],
          },
          {
            id: "section:1.2",
            title: "임원 및 직원 등에 관한 사항",
            children: [],
          },
        ],
      },
    ]);
  });

  test("fetches the selected TOC section through the source seam", async () => {
    const fake = createFakeSource({ contentHtml: "<div>배당 내용</div>" });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      sectionId: "section:1.1",
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
    });

    expect(fake.contentLocators).toEqual([childLocator]);
    expect(result.content).toMatchObject({
      scope: "section",
      format: "html",
      body: "<div>배당 내용</div>",
      section: {
        id: "section:1.1",
        title: "배당에 관한 사항",
      },
      isFullContent: true,
    });
    expect(result.navigation).toEqual({
      parent: {
        id: "section:1",
        title: "사 업 보 고 서",
      },
      previous: {
        id: "section:1",
        title: "사 업 보 고 서",
      },
      next: {
        id: "section:1.2",
        title: "임원 및 직원 등에 관한 사항",
      },
      children: [],
    });
    expect(result.metadata.source.endpoints).toEqual({
      shell: "https://dart.fss.or.kr/dsaf001/main.do",
      content: "https://dart.fss.or.kr/report/viewer.do",
    });
  });

  test("rejects stale section IDs with the correct recovery hint", async () => {
    const fake = createFakeSource();
    const provider = createDsaf001ViewReportProvider(fake.source);

    try {
      await provider.view({
        receipt: receiptNumber,
        sectionId: "section:old",
        outputFormat: "html",
        maxBytes: 200000,
        contentStartByte: 0,
      });
      throw new Error("Expected provider to reject the stale section ID.");
    } catch (error) {
      expect(error).toBeInstanceOf(ViewReportProviderError);
      if (!(error instanceof ViewReportProviderError)) throw error;
      expect(error.code).toBe("not_found");
      expect(error.parameter).toBe("sectionId");
      expect(error.message).toContain("같은 receipt/documentId");
      expect(error.message).toContain("toc[].id");
    }
  });

  test("sanitizes presentation-only HTML attributes in returned content", async () => {
    const fake = createFakeSource({
      contentHtml:
        '<table class="nb" border="1" width="601"><colgroup><col width="123"></colgroup><tr height="30"><td width="114" height="24" align="RIGHT" valign="BOTTOM" style="font-size:12pt;" colspan="2">소 &nbsp;<span style="color:red">계</span><br></td></tr></table>',
    });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      sectionId: "section:1.1",
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
    });

    expect(result.content?.body).toBe(
      '<table><tbody><tr><td colspan="2">소 계</td></tr></tbody></table>',
    );
  });

  test("returns best-effort markdown for selected content when requested", async () => {
    const fake = createFakeSource({
      contentHtml:
        "<h2>배당</h2><p><strong>현금</strong> 배당</p><table><tr><td colspan=\"2\">표</td></tr></table>",
    });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      sectionId: "section:1.1",
      outputFormat: "markdown",
      maxBytes: 200000,
      contentStartByte: 0,
    });

    expect(result.content).toMatchObject({
      scope: "section",
      format: "markdown",
      body: "## 배당\n\n**현금** 배당\n\n표",
      isFullContent: true,
    });
  });

  test("returns no-TOC document content by default", async () => {
    const shell = createNoTocShell();
    const fake = createFakeSource({
      shellForQuery: () => shell,
      contentHtml: "<p>정기주주총회결과</p>",
    });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: "20260331904807",
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
    });

    expect(shell.initialViewLocator).toBeDefined();
    expect(fake.contentLocators).toEqual([shell.initialViewLocator as SourceReportLocator]);
    expect(result.content).toMatchObject({
      scope: "document",
      format: "html",
      body: "<p>정기주주총회결과</p>",
    });
    expect(result.warnings).toEqual([
      {
        code: "no_toc_returned_document",
        message:
          "DART did not provide a table of contents for this document, so the selected document content was returned.",
      },
    ]);
  });

  test("truncates oversized fetched HTML with explicit size metadata", async () => {
    const fake = createFakeSource({ contentHtml: `<p>${"가".repeat(600)}</p>` });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      sectionId: "section:1.1",
      outputFormat: "html",
      maxBytes: 1000,
      contentStartByte: 0,
    });

    expect(result.content?.isFullContent).toBe(false);
    expect(result.content?.returnedBytes).toBeLessThanOrEqual(1000);
    expect(result.warnings).toEqual([
      {
        code: "content_truncated",
        message: `HTML content window returned UTF-8 bytes [0, ${result.content?.returnedBytes}) of ${result.content?.sizeBytes}.`,
      },
    ]);
  });

  test("returns an explicit rendered-content byte window", async () => {
    const fake = createFakeSource({ contentHtml: `<p>${"a".repeat(2_000)}</p>` });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      sectionId: "section:1.1",
      outputFormat: "html",
      maxBytes: 1_000,
      contentStartByte: 500,
    });

    expect(result.content).toMatchObject({
      body: "a".repeat(1_000),
      sizeBytes: 2_007,
      returnedBytes: 1_000,
      isFullContent: false,
      window: {
        unit: "utf8-bytes",
        startByte: 500,
        endByte: 1_500,
        hasMore: true,
        nextStartByte: 1_500,
      },
    });
  });

  test("does not warn for a final continuation window", async () => {
    const fake = createFakeSource({ contentHtml: `<p>${"a".repeat(1_200)}</p>` });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      sectionId: "section:1.1",
      outputFormat: "html",
      maxBytes: 1_000,
      contentStartByte: 1_000,
    });

    expect(result.content).toMatchObject({
      body: `${"a".repeat(203)}</p>`,
      returnedBytes: 207,
      isFullContent: false,
      window: {
        startByte: 1_000,
        endByte: 1_207,
        hasMore: false,
      },
    });
    expect(result.warnings).toEqual([]);
  });

  test("selects attachments by fetching the returned document query", async () => {
    const selectedAttachment = {
      ...attachmentDocument,
      selected: true,
    };
    const fake = createFakeSource({
      shellForQuery: (query) =>
        query === attachmentDocument.query
          ? createTocShell({
              sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?${attachmentDocument.query}`,
              documents: [
                { ...bodyDocument, selected: false },
                selectedAttachment,
              ],
              selectedDocument: selectedAttachment,
            })
          : createTocShell(),
    });
    const provider = createDsaf001ViewReportProvider(fake.source);

    const result = await provider.view({
      receipt: receiptNumber,
      documentId: "document:attachment:1",
      outputFormat: "html",
      maxBytes: 200000,
      contentStartByte: 0,
    });

    expect(fake.shellQueries).toEqual([undefined, attachmentDocument.query]);
    expect(result.document).toEqual({
      id: "document:attachment:1",
      title: "감사보고서",
      kind: "attachment",
      selected: true,
    });
    expect(result.references.viewerUrl).toBe(
      `https://dart.fss.or.kr/dsaf001/main.do?${attachmentDocument.query}`,
    );
  });

  test("rejects raw or stale document IDs with the correct recovery hint", async () => {
    const fake = createFakeSource();
    const provider = createDsaf001ViewReportProvider(fake.source);

    try {
      await provider.view({
        receipt: receiptNumber,
        documentId: "11213016",
        outputFormat: "html",
        maxBytes: 200000,
        contentStartByte: 0,
      });
      throw new Error("Expected provider to reject the document ID.");
    } catch (error) {
      expect(error).toBeInstanceOf(ViewReportProviderError);
      if (!(error instanceof ViewReportProviderError)) throw error;
      expect(error.code).toBe("not_found");
      expect(error.parameter).toBe("documentId");
      expect(error.message).toContain("documents[].id");
      expect(error.message).toContain("dcmNo");
    }
  });
});
