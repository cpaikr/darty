import { defaultCompanyDetailOperation } from "./company-detail.ts";
import { defaultCompanyRssOperation } from "./company-rss.ts";
import { defaultDisclosureTypesOperation } from "./disclosure-types.ts";
import { defaultReportGuideOperation } from "./report-guide.ts";
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
  "darty_get_report_guide",
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
      "Search DART filing body text by keyword, date window, and optional company/report filters. Do not use for report-title-only searches; use darty_search_company_reports reportName. To open a result, pass its references.viewerUrl or filing.receiptNumber to darty_view_report receipt.",
    operation: defaultSearchBodyOperation,
  }),
  createDartyAgentTool({
    name: "darty_search_company",
    description:
      "Search DART company overview records by company name. Use this to find DART company codes before company-specific filing searches when the user gave a company name rather than an 8-digit companyCode.",
    operation: defaultSearchCompanyOperation,
  }),
  createDartyAgentTool({
    name: "darty_search_company_reports",
    description:
      "Search DART filings for an 8-digit DART companyCode and date window. Use reportName for report title/name searches such as 'titled 사업보고서'. If the user gave only a company name, call darty_search_company first instead of using a memorized code. pageSize defaults to 15; compact 5/10 requests are normalized to 15.",
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
    name: "darty_get_report_guide",
    description:
      "Return the bundled Korean Markdown guide that explains which information appears in major DART report families. Use before searching when the user needs to know which report type or section likely contains the desired information.",
    operation: defaultReportGuideOperation,
  }),
  createDartyAgentTool({
    name: "darty_view_report",
    description:
      "Open a DART filing viewer by receipt number or viewer URL; call this tool when the task asks to open/view a filing, not just to quote a viewer URL. Use only documents[].id as documentId; do not pass DART dcmNo/documentNumber as documentId.",
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
