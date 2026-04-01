import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createContentsSearchOperation } from "../app/contents-search.ts";
import { executeContentsSearchCommand } from "../cli/commands/contents-search.ts";
import type { ContentsSearchProvider } from "../capabilities/contents-search/provider.ts";
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

const connectMcpPair = async (provider: ContentsSearchProvider) => {
  const server = createDartyMcpServer({
    operations: {
      contentsSearch: createContentsSearchOperation(provider),
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
  test("lists one contents-search tool with shared input and output schemas", async () => {
    const { client, close } = await connectMcpPair({
      search: async () => createProviderResult(),
    });

    try {
      const result = await client.listTools();
      const [tool] = result.tools;

      expect(result.tools).toHaveLength(1);
      expect(tool).toMatchObject({
        name: "contents-search",
        title: "DART Contents Search",
        description:
          "Semantic, read-only access to DART filing contents search backed by an internal dsab007 replay adapter.",
        annotations: {
          title: "DART Contents Search",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      });
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
        'Missing required parameter "keyword". Expected a non-empty string.',
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
