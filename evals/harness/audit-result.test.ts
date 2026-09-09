import { expect, test } from "bun:test";
import { auditWorkflowResult } from "./audit-result.ts";
import type { AgentWorkflowScenarioRunResult } from "../workflows/agent-types.ts";
import { agentWorkflowScenarios } from "../workflows/agent-scenarios.ts";

test("live audit retains provenance and counts without duplicated source or model prose", () => {
  const privateText = "LIVE_BODY_MUST_STAY_IN_MEMORY";
  const execution = { toolName: "run_darty_cli" as const, input: { argv: ["view-report", "--receipt", "20260101000001", "--section-id=section:1.1", privateText] }, display: privateText, exitCode: 0, stdout: JSON.stringify({ result: { receipt: { receiptNumber: "20260101000001" }, content: { scope: "section", section: { id: "section:1.1" }, body: privateText, window: { startByte: 0, endByte: 100, hasMore: false, extra: privateText } } } }), stderr: privateText, rejected: privateText };
  const result: AgentWorkflowScenarioRunResult = {
    scenario: agentWorkflowScenarios[0], pass: false, reasons: [privateText], finalAnswer: privateText,
    loop: { termination: "final-response", responseCount: 3, toolCallCount: 2, finalized: false, error: privateText, finalAnswer: privateText, toolExecutions: [execution], messages: [{ role: "assistant", content: privateText }] },
    toolExecutions: [execution],
    trace: { pass: false, reasons: [privateText], facts: { companyCodes: [], companyCodeDiscoveries: [], filings: [], reportSearches: [], viewedReceipts: [], tocs: [], successfulOperations: [], sectionCitations: [{ receiptNumber: "20260101000001", sectionId: "section:1.1", sectionTitle: privateText, bodyExcerpt: privateText, operationIndex: 0, contentWindow: { startByte: 0, endByte: 100, hasMore: false }, references: privateText, warnings: privateText }] } },
    finalAnswerCitations: { pass: false, reasons: [privateText], citations: [] },
    finalAnswerJudge: { status: "completed", pass: false, score: 2, raw: privateText, reasons: [privateText] },
    diagnostics: { executionFailures: [], evidenceLimitations: [{ operationIndex: 0, reason: privateText }], loopOutcome: "final-response", taskProvenance: { pass: false, reasons: [privateText] }, citationMembership: { pass: false, reasons: [privateText], citations: [] }, judging: "completed" },
  };
  const audit = auditWorkflowResult(result);
  expect(JSON.stringify(audit)).not.toContain(privateText);
  expect(audit.executions[0]?.requested).toMatchObject({ receipt: "20260101000001", sectionId: "section:1.1" });
  expect(audit.gates.provenanceReasons).toEqual(["other-assertion"]);
  expect(audit.loop.responseCount).toBe(3);
  expect(audit.selected[0]?.sectionId).toBe("section:1.1");
  expect(audit.executions[0]?.sectionId).toBe("section:1.1");
  expect(audit.selected[0]?.receiptNumber).toBe("20260101000001");
  expect(audit.executions[0]?.window).toEqual({ startByte: 0, endByte: 100, hasMore: false });
  expect(audit.judge).toEqual({ status: "completed", pass: false, score: 2, reasonCount: 1 });
});
