import { getArray, getRecord, getString, isRecord, type JsonRecord } from "../harness/json-record.ts";
import { collectWorkflowFacts, evaluateWorkflowTrace, normalizeWorkflowSectionTitle } from "./agent-assertions.ts";
import { agentWorkflowScenarios } from "./agent-scenarios.ts";
import { executeWorkflowToolCall } from "./agent-tools.ts";
import type { WorkflowToolExecution } from "./agent-types.ts";
import { validateFinalAnswerCitations } from "./final-answer-judge.ts";

// Diagnostic selection is deliberately separate from model onboarding. Every
// locator still comes from this execution's installed CLI responses.
export const runFixedResearchChecks = async (repoRoot: string): Promise<void> => {
  const executions: WorkflowToolExecution[] = [];
  const run = async (argv: string[]): Promise<JsonRecord> => {
    const execution = await executeWorkflowToolCall(repoRoot, {
      id: String(executions.length), type: "function",
      function: { name: "run_darty_cli", arguments: JSON.stringify({ argv }) },
    });
    executions.push(execution);
    if (execution.exitCode !== 0) throw new Error(`fixed research command ${argv[0]} exited ${execution.exitCode}`);
    const parsed: unknown = JSON.parse(execution.stdout);
    if (!isRecord(parsed)) throw new Error("fixed research CLI envelope is not an object");
    return getRecord(parsed, "result") ?? {};
  };
  const companies = await run(["search-company", "--company-name", "삼성전자", "--agent"]);
  const company = getArray(companies, "items")?.filter(isRecord).find(item => getString(item, "companyName") === "삼성전자");
  const companyCode = getString(company, "companyCode");
  if (companyCode === undefined) throw new Error("fixed research did not resolve the exact returned company name");
  const filings = await run(["search-company-reports", "--company-code", companyCode, "--start-date", "20250331", "--end-date", "20260331", "--disclosure-type", "A001", "--disclosure-type", "A002", "--disclosure-type", "A003", "--agent"]);
  const candidates = getArray(filings, "items")?.filter(isRecord).filter(item => /사업보고서|반기보고서|분기보고서/u.test(getString(item, "reportTitle") ?? "")).slice(0, 6) ?? [];
  let first: { receipt: string; section: string; title: string } | undefined;
  let second: { receipt: string; section: string; title: string } | undefined;
  for (const filing of candidates) {
    const receipt = getString(filing, "receiptNumber");
    if (receipt === undefined || receipt === first?.receipt) continue;
    const result = await run(["view-report", "--receipt", receipt, "--toc-depth", "1"]);
    const entries = getArray(result, "toc")?.filter(isRecord) ?? [];
    const entry = entries.find(item => {
      const title = getString(item, "title");
      return getString(item, "id") !== undefined && title !== undefined &&
        (first === undefined || normalizeWorkflowSectionTitle(title) === normalizeWorkflowSectionTitle(first.title));
    });
    const section = getString(entry, "id");
    const title = getString(entry, "title");
    if (section === undefined || title === undefined) continue;
    await run(["view-report", "--receipt", receipt, "--section-id", section, "--max-bytes", "2000"]);
    if (first === undefined) first = { receipt, section, title };
    else { second = { receipt, section, title }; break; }
  }
  if (first === undefined || second === undefined) throw new Error("fixed research lacked two distinct comparable sections in the first six periodic filing candidates");
  for (const scenario of agentWorkflowScenarios) {
    const selected = scenario.kind === "exact-section-citation" ? [first] : [first, second];
    const citations = selected.map(item => ({ receiptNumber: item.receipt, sectionId: item.section }));
    const answer = citations.map(item => `receiptNumber ${item.receiptNumber}, sectionId ${item.sectionId}`).join(". ");
    const trace = evaluateWorkflowTrace(scenario, executions, citations);
    const membership = validateFinalAnswerCitations({ scenario, facts: collectWorkflowFacts(executions, []), finalAnswer: answer });
    if (!trace.pass || !membership.pass) throw new Error(`fixed ${scenario.id}: ${[...trace.reasons, ...membership.reasons].join("; ")}`);
    console.log(`✓ fixed ${scenario.id}: ${JSON.stringify({ citations, windows: trace.facts.sectionCitations.map(item => ({ receiptNumber: item.receiptNumber, sectionId: item.sectionId, documentId: item.documentId, window: item.contentWindow })), toolCount: executions.length, provenance: trace.pass, membership: membership.pass, proseJudge: "not-applicable-deterministic-check" })}`);
  }
};
