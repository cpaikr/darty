import { describe, expect, test } from "bun:test";

import { evaluateWorkflowTrace } from "./agent-assertions.ts";
import type { AgentWorkflowScenario } from "./agent-scenarios.ts";
import type { WorkflowToolExecution } from "./agent-types.ts";

const exactScenario: AgentWorkflowScenario = {
  id: "test-exact",
  description: "test",
  kind: "exact-section-citation",
  startDate: "20250331",
  endDate: "20260331",
  task: "test",
};

const comparisonScenario: AgentWorkflowScenario = {
  id: "test-comparison",
  description: "test",
  kind: "related-filings-comparison",
  startDate: "20250331",
  endDate: "20260331",
  task: "test",
};

const execution = (
  argv: readonly string[],
  envelope: Record<string, unknown>,
): WorkflowToolExecution => ({
  toolName: "run_darty_cli",
  input: { argv },
  display: ["darty", ...argv].join(" "),
  exitCode: 0,
  stdout: JSON.stringify(envelope),
  stderr: "",
});

const company = execution(
  ["search-company", "--company-name", "삼성전자", "--agent"],
  { result: { items: [{ companyCode: "00126380" }] } },
);

const reports = execution(
  [
    "search-company-reports",
    "--company-code",
    "00126380",
    "--start-date",
    "20250331",
    "--end-date",
    "20260331",
    "--page-size",
    "2",
    "--agent",
  ],
  {
    result: {
      items: [
        {
          companyCode: "00126380",
          receiptDate: "2026-03-31",
          receiptNumber: "20260331000001",
          reportTitle: "사업보고서",
        },
        {
          companyCode: "00126380",
          receiptDate: "2025-03-31",
          receiptNumber: "20250331000001",
          reportTitle: "사업보고서",
        },
      ],
    },
  },
);

const outOfRangeReports = execution(
  [
    "search-company-reports",
    "--company-code",
    "00126380",
    "--start-date",
    "19000101",
    "--end-date",
    "21000101",
    "--page-size",
    "1",
    "--agent",
  ],
  {
    result: {
      items: [
        {
          companyCode: "00126380",
          receiptDate: "1900-01-01",
          receiptNumber: "19000101000001",
          reportTitle: "사업보고서",
        },
      ],
    },
  },
);

const toc = (receipt: string, sectionId: string) =>
  execution(
    ["view-report", "--receipt", receipt, "--toc-depth", "1"],
    {
      result: {
        receipt: { receiptNumber: receipt },
        toc: [{ id: sectionId, title: "I. 회사의 개요", children: [] }],
      },
    },
  );

const section = (
  receipt: string,
  sectionId: string,
  body: string,
  title = "I. 회사의 개요",
) =>
  execution(
    ["view-report", "--receipt", receipt, "--section-id", sectionId],
    {
      result: {
        receipt: { receiptNumber: receipt },
        request: { receipt, sectionId },
        content: {
          body,
          section: { id: sectionId, title },
        },
      },
    },
  );

describe("agent workflow trace assertions", () => {
  test("requires a section ID returned by the same report TOC", () => {
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:other", "Evidence"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("same receiptNumber");
  });

  test("rejects a mixed trace containing one cross-report section ID", () => {
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "Valid evidence"),
      section("20250331000001", "section:1", "Cross-report evidence"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("every retrieved section citation");
  });

  test("requires the returned receipt instead of request or argv echoes", () => {
    const missingReturnedReceipt = execution(
      ["view-report", "--receipt", "20260331000001", "--section-id", "section:1"],
      {
        result: {
          request: { receipt: "20260331000001", sectionId: "section:1" },
          content: {
            body: "Evidence",
            section: { id: "section:1", title: "I. 회사의 개요" },
          },
        },
      },
    );
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      missingReturnedReceipt,
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("authoritative result.receipt.receiptNumber");
    expect(result.facts.sectionCitations).toHaveLength(0);
  });

  test("requires the returned section instead of request or argv echoes", () => {
    const missingReturnedSection = execution(
      ["view-report", "--receipt", "20260331000001", "--section-id", "section:1"],
      {
        result: {
          receipt: { receiptNumber: "20260331000001" },
          request: { receipt: "20260331000001", sectionId: "section:1" },
          content: { body: "Evidence" },
        },
      },
    );
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      missingReturnedSection,
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("authoritative content.section.id");
    expect(result.facts.sectionCitations).toHaveLength(0);
  });

  test("requires Samsung filings and viewed receipts to stay in the returned filing graph", () => {
    const wrongCompanyReports = execution(
      [
        "search-company-reports",
        "--company-code",
        "00126380",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--agent",
      ],
      {
        result: {
          items: [
            {
              companyCode: "00000001",
              receiptNumber: "20260101000001",
              reportTitle: "사업보고서",
            },
          ],
        },
      },
    );
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      wrongCompanyReports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "Evidence"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("did not return Samsung companyCode");
    expect(result.reasons.join(" ")).toContain("was not returned by search-company-reports");
  });

  test("requires report searches to use a company code discovered earlier", () => {
    const result = evaluateWorkflowTrace(exactScenario, [
      reports,
      company,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "Evidence"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain(
      "was not returned by an earlier successful search-company call",
    );
  });

  test("requires each comparison citation to match its own report TOC", () => {
    const result = evaluateWorkflowTrace(comparisonScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      toc("20250331000001", "section:2"),
      section("20260331000001", "section:1", "First evidence"),
      section("20250331000001", "section:1", "Cross-report evidence"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("each comparison section citation");
  });

  test("rejects a broad report window and out-of-range returned filing", () => {
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      outOfRangeReports,
      toc("19000101000001", "section:1"),
      section("19000101000001", "section:1", "Out-of-range evidence"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("did not match required range");
    expect(result.reasons.join(" ")).toContain("was outside required range");
  });

  test("accepts returned filing dates on both inclusive range boundaries", () => {
    const result = evaluateWorkflowTrace(exactScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "Boundary evidence"),
    ]);

    expect(result.pass).toBe(true);
    expect(result.facts.filings.map((filing) => filing.receiptDate)).toEqual([
      "2026-03-31",
      "2025-03-31",
    ]);
  });

  test("accepts two related filings with matching section evidence", () => {
    const result = evaluateWorkflowTrace(comparisonScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "First evidence"),
      toc("20250331000001", "section:1"),
      section("20250331000001", "section:1", "Second evidence"),
    ]);

    expect(result.pass).toBe(true);
    expect(result.facts.sectionCitations).toHaveLength(2);
  });

  test("rejects comparison evidence with different normalized section titles", () => {
    const result = evaluateWorkflowTrace(comparisonScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "First evidence", "I. 회사의 개요"),
      toc("20250331000001", "section:1"),
      section("20250331000001", "section:1", "Second evidence", "II. 재무에 관한 사항"),
    ]);

    expect(result.pass).toBe(false);
    expect(result.reasons.join(" ")).toContain("same normalized section title");
  });

  test("normalizes harmless punctuation differences in comparison titles", () => {
    const result = evaluateWorkflowTrace(comparisonScenario, [
      company,
      reports,
      toc("20260331000001", "section:1"),
      section("20260331000001", "section:1", "First evidence", "I. 회사의 개요"),
      toc("20250331000001", "section:1"),
      section("20250331000001", "section:1", "Second evidence", "I 회사의 개요"),
    ]);

    expect(result.pass).toBe(true);
  });
});
