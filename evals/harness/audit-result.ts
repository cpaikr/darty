import { createHash } from "node:crypto";
import type { ModelLoopResult } from "./model-loop.ts";
import type { ToolExecution } from "./tool-trace.ts";
import { getRecord, getString, isRecord } from "./json-record.ts";
import type { AgentWorkflowScenarioRunResult } from "../workflows/agent-types.ts";
import { extractFinalAnswerCitations } from "../workflows/final-answer-judge.ts";

const reasonCategories = (reasons: readonly string[]) => {
  const patterns: readonly [string, RegExp][] = [
    ["missing-operation", /did not complete a successful|never called|never ran/u],
    ["company-discovery", /resolve Samsung|company code|companyCode/u],
    ["request-mismatch", /scenario request|expected --|source request|date window|date range/u],
    ["filing-provenance", /filing search|filing receipt|returned filing/u],
    ["missing-toc", /non-empty report TOC/u],
    ["section-provenance", /TOC|sectionId|section id|section ID/u],
    ["missing-section-body", /non-empty report section body/u],
    ["comparison-evidence", /comparison|two distinct|normalized section title/u],
    ["citation-membership", /citation|unpaired|unknown|ambiguous|malformed labelled/u],
    ["source-envelope", /malformed successful|missing result|missing authoritative|unknown scope/u],
  ];
  return [...new Set(reasons.flatMap(reason => {
    const matches = patterns.filter(([, pattern]) => pattern.test(reason)).map(([code]) => code);
    return matches.length ? matches : ["other-assertion"];
  }))];
};

const fingerprint = (text: string) => ({ characters: text.length, sha256: createHash("sha256").update(text).digest("hex") });
const publicId = (value: unknown, pattern: RegExp): string | undefined => typeof value === "string" && pattern.test(value) ? value : undefined;
const receipt = (value: unknown) => publicId(value, /^20\d{12}$/u);
const section = (value: unknown) => publicId(value, /^section:\d+(?:\.\d+)*$/u);
const document = (value: unknown) => publicId(value, /^document:(?:body|attachment):\d+$/u);
const windowMetadata = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).filter(([key, child]) =>
    (["startByte", "endByte", "nextStartByte", "bodyCharacters", "sourceBodyCharacters"].includes(key) && typeof child === "number" && Number.isSafeInteger(child) && child >= 0) ||
    (key === "hasMore" && typeof child === "boolean") || (key === "unit" && child === "utf8-bytes")));
};

const requestMetadata = (value: unknown) => {
  const record = isRecord(value) ? value : {};
  return {
    companyCode: publicId(record.companyCode, /^\d{8}$/u),
    receipt: receipt(record.receipt), sectionId: section(record.sectionId), documentId: document(record.documentId),
    startDate: publicId(record.startDate, /^\d{8}$/u), endDate: publicId(record.endDate, /^\d{8}$/u),
  };
};

const executionAudit = (execution: ToolExecution, operationIndex: number) => {
  let envelope: unknown;
  try { envelope = JSON.parse(execution.stdout); } catch { /* Help/errors can be plain text. */ }
  const record = isRecord(envelope) ? envelope : undefined;
  const result = getRecord(record, "result");
  const content = getRecord(result, "content");
  const input = isRecord(execution.input) ? execution.input : undefined;
  const argv = Array.isArray(input?.argv) ? input.argv : [];
  const requested: Record<string, unknown> = {};
  const requestFlags: Record<string, string> = { "--company-code": "companyCode", "--receipt": "receipt", "--section-id": "sectionId", "--document-id": "documentId", "--start-date": "startDate", "--end-date": "endDate" };
  for (const [index, argument] of argv.entries()) {
    if (typeof argument !== "string") continue;
    const separator = argument.indexOf("=");
    const flag = separator < 0 ? argument : argument.slice(0, separator);
    const key = requestFlags[flag];
    if (key !== undefined) requested[key] = separator < 0 ? argv[index + 1] : argument.slice(separator + 1);
  }
  const command = ["search-company", "search-company-reports", "view-report", "search-body", "help", "--help", "-h"].includes(String(argv[0])) ? argv[0] : "unknown";
  return {
    operationIndex, command, requested: requestMetadata(requested), returnedRequest: requestMetadata(result?.request),
    candidates: (Array.isArray(result?.items) ? result.items : []).filter(isRecord).map(item => ({
      companyCode: publicId(item.companyCode ?? getRecord(item, "company")?.companyCode, /^\d{8}$/u),
      receiptNumber: receipt(item.receiptNumber ?? getRecord(item, "filing")?.receiptNumber),
      receiptDate: publicId(item.receiptDate ?? getRecord(item, "filing")?.receiptDate, /^\d{4}-\d{2}-\d{2}$|^\d{8}$/u),
    })),
    exitCode: execution.exitCode, rejected: execution.rejected !== undefined,
    stdout: fingerprint(execution.stdout), stderr: fingerprint(execution.stderr),
    errorCode: publicId(getString(getRecord(record, "error"), "code"), /^[a-z_]{1,64}$/u),
    receiptNumber: receipt(getString(getRecord(result, "receipt"), "receiptNumber")),
    documentId: document(getString(getRecord(result, "document"), "id")),
    scope: ["section", "document"].includes(String(content?.scope)) ? content?.scope : undefined,
    sectionId: section(getString(getRecord(content, "section"), "id")),
    window: windowMetadata(content?.window),
  };
};

// Live bodies, model prose, and free-form errors remain in memory. An allowlist
// prevents duplicate body text in messages, trace excerpts, or judge explanations
// from bypassing the provider's retention boundary.
export const auditLoopResult = (result: {
  readonly pass: boolean; readonly reasons: readonly string[];
  readonly loop: ModelLoopResult<string>; readonly finalAnswer: string;
  readonly toolExecutions: readonly ToolExecution[];
}) => ({
  pass: result.pass, reasonCount: result.reasons.length, assertionCategories: reasonCategories(result.reasons),
  loop: { termination: result.loop.termination, responseCount: result.loop.responseCount, toolCallCount: result.loop.toolCallCount, finalized: result.loop.finalized },
  finalAnswer: fingerprint(result.finalAnswer),
  executions: result.toolExecutions.map(executionAudit),
});

export const auditWorkflowResult = (result: AgentWorkflowScenarioRunResult) => ({
  ...auditLoopResult(result),
  gates: { provenance: result.trace.pass, citations: result.finalAnswerCitations.pass, provenanceReasons: reasonCategories(result.trace.reasons), citationReasons: reasonCategories(result.finalAnswerCitations.reasons) },
  judge: { status: result.finalAnswerJudge.status, pass: result.finalAnswerJudge.pass, score: result.finalAnswerJudge.score, reasonCount: result.finalAnswerJudge.reasons.length },
  selected: result.trace.facts.sectionCitations.map(item => ({
    receiptNumber: receipt(item.receiptNumber), sectionId: section(item.sectionId), documentId: document(item.documentId),
    operationIndex: item.operationIndex, window: windowMetadata(item.contentWindow), modelView: windowMetadata(item.modelView),
    body: fingerprint(item.bodyExcerpt),
  })),
  cited: extractFinalAnswerCitations(result.finalAnswer).map(item => ({ receiptNumber: receipt(item.receiptNumber), sectionId: section(item.sectionId) })),
  evidenceLimitations: result.diagnostics.evidenceLimitations.map(item => ({
    operationIndex: item.operationIndex,
    category: item.reason.startsWith("body truncated") ? "body-projection" : "envelope-unavailable",
  })),
});
