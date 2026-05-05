import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createContentsSearchOperation } from "../app/contents-search.ts";
import { createReportViewOperation } from "../app/report-view.ts";
import { executeContentsSearchCommand } from "../cli/commands/contents-search.ts";
import type { ContentsSearchProvider } from "../capabilities/contents-search/provider.ts";
import type { ReportViewProvider } from "../capabilities/report-view/provider.ts";
import { createDartyMcpServer } from "./server.ts";

type TextContentBlock = {
  readonly type: "text";
  readonly text: string;
};

const createProviderResult = () => ({
  pagination: {
    currentPage: 1,
    totalPages: 2,
    totalCount: 11,
    returnedCount: 1,
  },
  items: [
    {
      company: {
        name: "유일에너테크",
        marketLabel: "코스닥시장",
        companyCode: "01368637",
      },
      filing: {
        receiptNumber: "20260331904807",
        documentNumber: "11216440",
        reportTitle: "정기주주총회결과",
        reportModifier: undefined,
        reportPeriod: undefined,
        reportNameSuffix: undefined,
        receiptDate: "2026-03-31",
      },
      match: {
        snippetText: "배당",
        disclosureTypeLabel: "거래소공시",
        contentTypeLabel: "본문",
        presenterName: "유일에너테크",
      },
      references: {
        viewerUrl:
          "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807",
      },
      evidence: {
        reportNameRaw: "정기주주총회결과",
        rawInfoText: "[거래소공시] [본문] 제출인 : 유일에너테크",
        snippetHtml: "<strong>배당</strong>",
      },
    },
  ],
  metadata: {
    fetchedAt: "2026-03-31T00:00:00.000Z",
    source: {
      system: "dart" as const,
      surface: "dsab007" as const,
      endpoint: "https://dart.fss.or.kr/dsab007/search.ax",
    },
    sourceBehavior: {
      effectivePageSize: 10,
      effectivePagerWidth: 10,
      callerControlsPageSize: false as const,
      callerControlsPagerWidth: false as const,
      observationStatus: "observed" as const,
    },
    completeness: "complete" as const,
    droppedItemCount: 0,
  },
  references: {
    searchUrl: "https://dart.fss.or.kr/dsab007/search.ax",
  },
  warnings: [],
});

const createReportViewProviderResult = () => ({
  receipt: {
    receiptNumber: "20260331004166",
  },
  document: {
    id: "document:body:1",
    title: "사업보고서",
    kind: "body" as const,
    selected: true,
  },
  documents: [
    {
      id: "document:body:1",
      title: "사업보고서",
      kind: "body" as const,
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
  metadata: {
    fetchedAt: "2026-05-05T00:00:00.000Z",
    source: {
      system: "dart" as const,
      surface: "dsaf001" as const,
      endpoints: {
        shell: "https://dart.fss.or.kr/dsaf001/main.do",
      },
    },
    tocSource: "dart" as const,
    outputFormat: "html" as const,
  },
  references: {
    viewerUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
  },
  warnings: [],
});

const connectMcpPair = async (
  provider: ContentsSearchProvider,
  reportViewProvider: ReportViewProvider = {
    view: async () => createReportViewProviderResult(),
  },
) => {
  const server = createDartyMcpServer({
    operations: {
      contentsSearch: createContentsSearchOperation(provider),
      reportView: createReportViewOperation(reportViewProvider),
    },
  });
  const client = new Client(
    { name: "darty-test-client", version: "0.1.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    client,
    server,
    close: async () => {
      await Promise.all([client.close(), server.close()]);
    },
  };
};

describe("createDartyMcpServer", () => {
  test("lists contents-search and report-view tools with shared input and output schemas", async () => {
    const { client, close } = await connectMcpPair({
      search: async () => createProviderResult(),
    });

    try {
      const result = await client.listTools();
      const tool = result.tools.find((candidate) => candidate.name === "contents-search");
      const reportViewTool = result.tools.find(
        (candidate) => candidate.name === "report-view",
      );

      expect(result.tools).toHaveLength(2);
      expect(tool).toMatchObject({
        name: "contents-search",
        title: "DART 본문내용 검색",
        annotations: {
          title: "DART 본문내용 검색",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      });
      const toolDescription = String(tool?.description);
      expect(toolDescription).toContain("`사과 포도`=AND");
      expect(toolDescription).toContain("`사과|포도`=OR");
      expect(toolDescription).toContain("`사과!포도`=NOT");
      expect(tool?.inputSchema.required).toEqual([
        "keyword",
        "startDate",
        "endDate",
      ]);
      expect(tool?.inputSchema.properties?.keyword).toBeDefined();
      expect(tool?.inputSchema.properties?.startDate).toBeDefined();
      expect(tool?.inputSchema.properties?.maxResults).toBeUndefined();
      expect(tool?.inputSchema.properties?.textCrpNm).toBeUndefined();
      expect(tool?.outputSchema).toBeDefined();
      expect(tool?.outputSchema?.properties?.result).toBeDefined();
      expect(tool?.outputSchema?.properties?.metadata).toBeDefined();
      expect(tool?.outputSchema?.properties?.references).toBeDefined();
      expect(tool?.outputSchema?.properties?.warnings).toBeDefined();
      expect(tool?.outputSchema?.properties?.error).toBeUndefined();
      expect(reportViewTool).toMatchObject({
        name: "report-view",
        title: "DART 보고서 보기",
        annotations: {
          title: "DART 보고서 보기",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      });
      expect(reportViewTool?.inputSchema.required).toEqual(["receipt"]);
      expect(reportViewTool?.inputSchema.properties?.receipt).toBeDefined();
      expect(reportViewTool?.inputSchema.properties?.sectionId).toBeDefined();
      expect(reportViewTool?.outputSchema?.properties?.result).toBeDefined();
    } finally {
      await close();
    }
  });

  test("executes the shared contents-search operation and returns the structured result envelope", async () => {
    let receivedRequest: Record<string, unknown> | undefined;
    const { client, close } = await connectMcpPair({
      search: async (request) => {
        receivedRequest = request as unknown as Record<string, unknown>;
        return createProviderResult();
      },
    });

    try {
      const result = await client.callTool({
        name: "contents-search",
        arguments: {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        },
      });
      const content = result.content as readonly TextContentBlock[];

      expect(receivedRequest).toEqual({
        page: 1,
        sortBy: "date",
        sortDirection: "desc",
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: undefined,
        presenterName: undefined,
        reportName: undefined,
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({
        result: {
          request: {
            keyword: "배당",
            startDate: "20250331",
            endDate: "20260331",
          },
          pagination: {
            currentPage: 1,
            totalPages: 2,
            totalCount: 11,
            returnedCount: 1,
          },
        },
        metadata: {
          completeness: "complete",
        },
      });
      expect(content[0]?.type).toBe("text");
      expect(JSON.parse(content[0]?.text ?? "")).toEqual(result.structuredContent);
    } finally {
      await close();
    }
  });

  test("executes the shared report-view operation and returns a structured result envelope", async () => {
    let receivedRequest: Record<string, unknown> | undefined;
    const { client, close } = await connectMcpPair(
      {
        search: async () => createProviderResult(),
      },
      {
        view: async (request) => {
          receivedRequest = request as unknown as Record<string, unknown>;
          return createReportViewProviderResult();
        },
      },
    );

    try {
      const result = await client.callTool({
        name: "report-view",
        arguments: {
          receipt: "20260331004166",
          sectionId: "section:1",
        },
      });
      const content = result.content as readonly TextContentBlock[];

      expect(receivedRequest).toEqual({
        receipt: "20260331004166",
        documentId: undefined,
        sectionId: "section:1",
        outputFormat: "html",
        maxBytes: 200000,
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({
        result: {
          request: {
            receipt: "20260331004166",
            sectionId: "section:1",
            outputFormat: "html",
          },
          receipt: {
            receiptNumber: "20260331004166",
          },
          toc: [
            {
              id: "section:1",
              title: "사 업 보 고 서",
            },
          ],
        },
        metadata: {
          tocSource: "dart",
        },
      });
      expect(content[0]?.type).toBe("text");
      expect(JSON.parse(content[0]?.text ?? "")).toEqual(result.structuredContent);
    } finally {
      await close();
    }
  });

  test("reports capability validation failures as MCP tool errors outside the success schema", async () => {
    let providerCalled = false;
    const { client, close } = await connectMcpPair({
      search: async () => {
        providerCalled = true;
        return createProviderResult();
      },
    });

    try {
      const result = await client.callTool({
        name: "contents-search",
        arguments: {
          startDate: "20250331",
          endDate: "20260331",
        },
      });
      const content = result.content as readonly TextContentBlock[];

      expect(providerCalled).toBe(false);
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      expect(content[0]?.type).toBe("text");
      expect(content[0]?.text).toBe(
        '필수 매개변수 "keyword"이(가) 없습니다. 필요한 값: 비어 있지 않은 문자열.',
      );
    } finally {
      await close();
    }
  });

  test("keeps CLI and MCP aligned on the same shared success envelope", async () => {
    const operation = createContentsSearchOperation({
      search: async () => createProviderResult(),
    });
    const { client, close } = await connectMcpPair({
      search: async () => createProviderResult(),
    });
    const writes: string[] = [];

    try {
      await executeContentsSearchCommand(
        {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        },
        {
          runOperation: (input) => operation.execute(input),
          writeStdout: (text) => {
            writes.push(text);
          },
        },
      );

      const mcpResult = await client.callTool({
        name: "contents-search",
        arguments: {
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        },
      });

      expect(JSON.parse(writes[0] ?? "")).toEqual(mcpResult.structuredContent);
    } finally {
      await close();
    }
  });
});
