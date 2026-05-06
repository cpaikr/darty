import { describe, expect, test } from "bun:test";

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
    });

    expect(fake.contentLocators).toEqual([childLocator]);
    expect(result.content).toMatchObject({
      scope: "section",
      format: "html",
      html: "<div>배당 내용</div>",
      section: {
        id: "section:1.1",
        title: "배당에 관한 사항",
      },
      truncated: false,
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
    });

    expect(shell.initialViewLocator).toBeDefined();
    expect(fake.contentLocators).toEqual([shell.initialViewLocator as SourceReportLocator]);
    expect(result.content).toMatchObject({
      scope: "document",
      html: "<p>정기주주총회결과</p>",
    });
    expect(result.warnings).toEqual([
      {
        code: "no_toc_returned_document",
        message:
          "DART did not provide a table of contents for this document, so the selected document HTML was returned.",
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
    });

    expect(result.content?.truncated).toBe(true);
    expect(result.content?.returnedBytes).toBeLessThanOrEqual(1000);
    expect(result.warnings).toEqual([
      {
        code: "content_truncated",
        message: `HTML content was truncated from ${result.content?.sizeBytes} bytes to ${result.content?.returnedBytes} bytes.`,
      },
    ]);
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
});
