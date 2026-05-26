import { describe, expect, test } from "bun:test";

import type { ToolExecution } from "../../search-body/agent-native/types.ts";
import { evaluateWorkflowInvocation } from "./invocation-assertions.ts";
import { workflowScenarios, type WorkflowScenario } from "./scenarios.ts";

const scenarioById = (id: string): WorkflowScenario => {
  const scenario = workflowScenarios.find((candidate) => candidate.id === id);
  if (scenario === undefined) {
    throw new Error(`missing workflow scenario ${id}`);
  }
  return scenario;
};

const execution = (
  toolName: ToolExecution["toolName"],
  input: unknown,
  result: unknown,
): ToolExecution => ({
  toolName,
  input,
  display: `${toolName} ${JSON.stringify(input)}`,
  exitCode: 0,
  stdout: JSON.stringify(result),
  stderr: "",
});

const companySearch = execution(
  "darty_search_company",
  { companyName: "삼성전자" },
  { result: { items: [{ companyCode: "00126380" }] } },
);

const companyReports = (input: Record<string, unknown> = {}) =>
  execution(
    "darty_search_company_reports",
    {
      companyCode: "00126380",
      startDate: "20240101",
      endDate: "20260331",
      reportName: "사업보고서",
      ...input,
    },
    {
      result: {
        items: [
          {
            filing: { receiptNumber: "20260331000001" },
            references: {
              viewerUrl:
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331000001",
            },
          },
          {
            filing: { receiptNumber: "20250331000002" },
            references: {
              viewerUrl:
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20250331000002",
            },
          },
        ],
      },
    },
  );

const viewReport = (receipt: string) =>
  execution("darty_view_report", { receipt }, { result: { toc: [] } });

const noResultCompanyReports = execution(
  "darty_search_company_reports",
  {
    companyCode: "00126380",
    startDate: "20250331",
    endDate: "20260331",
    reportName: "unlikely-darty-eval-keyword-20260404",
  },
  { result: { items: [] } },
);

const noResultBodySearch = execution(
  "darty_search_body",
  {
    keyword: "unlikely-darty-eval-keyword-20260404",
    startDate: "20250331",
    endDate: "20260331",
    companyCode: "00126380",
  },
  { result: { items: [] } },
);

const noResultScenario = scenarioById("no-result-does-not-invent-reference");
const noResultBodySearchScenario: WorkflowScenario = {
  id: "body-search-no-result-does-not-invent-reference",
  description: "confirm a no-result body search without inventing references",
  task: "Search body text for an unlikely keyword and do not invent references.",
  bodySearch: {
    keyword: "unlikely-darty-eval-keyword-20260404",
    startDate: "20250331",
    endDate: "20260331",
    companyCode: "00126380",
    expectedItems: "empty",
    forbidViewReportWhenEmpty: true,
  },
};
const companyNameToBodySearchScenario: WorkflowScenario = {
  ...noResultBodySearchScenario,
  companySearch: {
    companyName: "삼성전자",
    expectedCompanyCode: "00126380",
  },
};
const inventedReferenceReason =
  "final answer included a filing reference after the source search returned no filing references";

describe("evaluateWorkflowInvocation", () => {
  test("requires a final assistant answer", () => {
    const reasons = evaluateWorkflowInvocation(
      scenarioById("latest-annual-report-viewer-reference"),
      [companySearch, companyReports(), viewReport("20260331000001")],
      { finalAnswer: "" },
    );

    expect(reasons).toContain("agent did not produce a final answer");
  });

  test("accepts a latest-report workflow that opens the first returned report", () => {
    const reasons = evaluateWorkflowInvocation(
      scenarioById("latest-annual-report-viewer-reference"),
      [companySearch, companyReports(), viewReport("20260331000001")],
      { finalAnswer: "Opened 20260331000001." },
    );

    expect(reasons).toEqual([]);
  });

  test("requires latest-report workflows to use descending first-page results and open the first item", () => {
    const reasons = evaluateWorkflowInvocation(
      scenarioById("latest-annual-report-viewer-reference"),
      [
        companySearch,
        companyReports({ sortDirection: "asc", page: 2 }),
        viewReport("20250331000002"),
      ],
      { finalAnswer: "Opened 20250331000002." },
    );

    expect(reasons).toContain(
      "darty_search_company_reports expected date-desc order for latest report lookup, received sortDirection=asc",
    );
    expect(reasons).toContain(
      "darty_search_company_reports expected first page for latest report lookup, received page=2",
    );
    expect(reasons).toContain(
      "first darty_view_report call after the source search expected receipt 20260331000001, received 20250331000002",
    );
  });

  test("forbids opening a report after an empty no-result source search", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultScenario,
      [companySearch, noResultCompanyReports, viewReport("20260331000001")],
      { finalAnswer: "No matching filings were found." },
    );

    expect(reasons).toContain(
      "darty_view_report was called after the source search returned no filing references",
    );
  });

  test("forbids a DART viewer URL in a no-result final answer", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultScenario,
      [companySearch, noResultCompanyReports],
      {
        finalAnswer:
          "No matching filings were found. See https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331000001.",
      },
    );

    expect(reasons).toContain(inventedReferenceReason);
  });

  test("forbids an rcpNo query parameter in a no-result final answer", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultScenario,
      [companySearch, noResultCompanyReports],
      { finalAnswer: "No matching filings were found for rcpNo=20260331000001." },
    );

    expect(reasons).toContain(inventedReferenceReason);
  });

  test("forbids a standalone receipt number in a no-result final answer", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultScenario,
      [companySearch, noResultCompanyReports],
      { finalAnswer: "No matching filings were found, including 20260331000001." },
    );

    expect(reasons).toContain(inventedReferenceReason);
  });

  test("accepts benign no-result prose without filing references", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultScenario,
      [companySearch, noResultCompanyReports],
      { finalAnswer: "No matching filings were found for that report-name filter." },
    );

    expect(reasons).toEqual([]);
  });

  test("requires body-search workflows with company names to look up the company first", () => {
    const reasons = evaluateWorkflowInvocation(
      companyNameToBodySearchScenario,
      [noResultBodySearch, companySearch],
      { finalAnswer: "No matching body-search evidence was found." },
    );

    expect(reasons).toContain("darty_search_body ran before darty_search_company");
  });

  test("forbids opening a report after an empty body-search source", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultBodySearchScenario,
      [noResultBodySearch, viewReport("20260331000001")],
      { finalAnswer: "No matching body-search evidence was found." },
    );

    expect(reasons).toContain(
      "darty_view_report was called after the source search returned no filing references",
    );
  });

  test("forbids a filing reference in a no-result body-search final answer", () => {
    const reasons = evaluateWorkflowInvocation(
      noResultBodySearchScenario,
      [noResultBodySearch],
      { finalAnswer: "No matching body-search evidence was found in 20260331000001." },
    );

    expect(reasons).toContain(inventedReferenceReason);
  });
});
