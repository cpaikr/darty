import { defaultCompanyDetailOperation } from "./company-detail.ts";
import { defaultCompanyRssOperation } from "./company-rss.ts";
import { defaultDisclosureTypesOperation } from "./disclosure-types.ts";
import { defaultSearchBodyOperation } from "./search-body.ts";
import { defaultSearchCompanyOperation } from "./search-company.ts";
import { defaultSearchCompanyReportsOperation } from "./search-company-reports.ts";
import { defaultViewReportOperation } from "./view-report.ts";

export const dartyAgentToolNames = [
  "darty_search_body",
  "darty_search_company",
  "darty_search_company_reports",
  "darty_get_company_detail",
  "darty_get_company_rss",
  "darty_list_disclosure_types",
  "darty_view_report",
] as const;

export type DartyAgentToolName = (typeof dartyAgentToolNames)[number];

export type DartyAgentToolDefinition = {
  readonly type: "function";
  readonly function: {
    readonly name: DartyAgentToolName;
    readonly description: string;
    readonly parameters: unknown;
  };
};

export type DartyAgentTool = {
  readonly name: DartyAgentToolName;
  readonly operationName: string;
  readonly definition: DartyAgentToolDefinition;
  readonly resultJsonSchema: unknown;
  readonly execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type AppOperation = {
  readonly name: string;
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly execute: (input: Record<string, unknown>) => Promise<unknown>;
};

const createDartyAgentTool = (input: {
  readonly name: DartyAgentToolName;
  readonly description: string;
  readonly operation: AppOperation;
}): DartyAgentTool => ({
  name: input.name,
  operationName: input.operation.name,
  definition: {
    type: "function",
    function: {
      name: input.name,
      description: input.description,
      parameters: input.operation.inputJsonSchema,
    },
  },
  resultJsonSchema: input.operation.resultJsonSchema,
  execute: input.operation.execute,
});

export const dartyAgentTools = [
  createDartyAgentTool({
    name: "darty_search_body",
    description:
      "Search DART filing body text by keyword, date window, and optional company/report filters. Returns the shared search-body capability envelope with filing references.",
    operation: defaultSearchBodyOperation,
  }),
  createDartyAgentTool({
    name: "darty_search_company",
    description:
      "Search DART company overview records by company name. Use this to find DART company codes before company-specific filing searches.",
    operation: defaultSearchCompanyOperation,
  }),
  createDartyAgentTool({
    name: "darty_search_company_reports",
    description:
      "Search DART filings for a known 8-digit DART company code and date window, with optional report-name and DART filter codes.",
    operation: defaultSearchCompanyReportsOperation,
  }),
  createDartyAgentTool({
    name: "darty_get_company_detail",
    description:
      "Get DART company overview details for a known 8-digit DART company code, including names, listing metadata, contact fields, and industry information when DART provides them.",
    operation: defaultCompanyDetailOperation,
  }),
  createDartyAgentTool({
    name: "darty_get_company_rss",
    description:
      "Get the DART company-specific disclosure RSS feed for a known 8-digit DART company code. Use this for a compact recent filing feed.",
    operation: defaultCompanyRssOperation,
  }),
  createDartyAgentTool({
    name: "darty_list_disclosure_types",
    description:
      "List or search DART detailed disclosure-type codes for search-company-reports disclosureTypes. Optionally filter by category A-J or Korean/code query.",
    operation: defaultDisclosureTypesOperation,
  }),
  createDartyAgentTool({
    name: "darty_view_report",
    description:
      "Open a DART filing viewer by receipt number or viewer URL and optionally retrieve a document or section window.",
    operation: defaultViewReportOperation,
  }),
] as const satisfies readonly DartyAgentTool[];

export const dartyAgentToolDefinitions = dartyAgentTools.map(
  (tool) => tool.definition,
);

export const isDartyAgentToolName = (value: unknown): value is DartyAgentToolName =>
  typeof value === "string" &&
  dartyAgentToolNames.includes(value as DartyAgentToolName);

export const getDartyAgentTool = (name: DartyAgentToolName): DartyAgentTool => {
  const tool = dartyAgentTools.find((candidate) => candidate.name === name);

  if (tool === undefined) {
    throw new Error(`Unknown darty agent tool: ${name}`);
  }

  return tool;
};

export const executeDartyAgentTool = async (
  name: DartyAgentToolName,
  input: Record<string, unknown>,
): Promise<unknown> => getDartyAgentTool(name).execute(input);
