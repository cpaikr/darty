export type AgentWorkflowScenarioKind =
  | "exact-section-citation"
  | "related-filings-comparison";

export type AgentWorkflowScenario = {
  readonly id: string;
  readonly description: string;
  readonly kind: AgentWorkflowScenarioKind;
  readonly task: string;
  readonly startDate: string;
  readonly endDate: string;
};

export const agentWorkflowScenarios = [
  {
    id: "exact-section-citation",
    description:
      "the agent retrieves a report section and cites the exact receipt and section IDs",
    kind: "exact-section-citation",
    startDate: "20250331",
    endDate: "20260331",
    task:
      "Use the local darty CLI to research Samsung Electronics filings. Find a recent filing in the 20250331–20260331 window, inspect that report's table of contents, and read one returned section. Answer concisely using evidence from the section. Include an exact citation containing the receiptNumber and sectionId returned for the same report; never invent or reuse a sectionId from another report.",
  },
  {
    id: "related-filings-comparison",
    description:
      "the agent retrieves one comparable section from two related filings and cites both",
    kind: "related-filings-comparison",
    startDate: "20250331",
    endDate: "20260331",
    task:
      "Use the local darty CLI to compare Samsung Electronics across two distinct related filings in the 20250331–20260331 window. Find the filings, inspect each report's table of contents separately, and retrieve sections with the same normalized title from each report. Give a concise comparison grounded in the returned section bodies. Include at least two exact citations, each pairing that filing's receiptNumber with the sectionId returned for that same receipt; never invent or reuse a sectionId across reports.",
  },
] as const satisfies readonly AgentWorkflowScenario[];
