import type { ToolExecution } from "../harness/tool-trace.ts";
import type { AgentWorkflowScenario } from "./agent-scenarios.ts";
import {
  type ParsedWorkflowInvocation,
  validateWorkflowCliArgv,
} from "./agent-tools.ts";

type ParsedWorkflowOperation = Extract<
  ParsedWorkflowInvocation,
  { readonly kind: "operation" }
>;

type JsonRecord = Record<string, unknown>;

const samsungCompanyCode = "00126380";

export type WorkflowFilingFact = {
  readonly receiptNumber: string;
  readonly companyCode: string | undefined;
  readonly reportTitle: string | undefined;
  readonly receiptDate: string | undefined;
};

export type WorkflowTocFact = {
  readonly receiptNumber: string;
  readonly sectionIds: readonly string[];
};

export type WorkflowSectionCitation = {
  readonly receiptNumber: string;
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly bodyExcerpt: string;
};

export type WorkflowCompanyCodeFact = {
  readonly companyCode: string;
  readonly operationIndex: number;
};

export type WorkflowReportSearchFact = {
  readonly companyCode: string | undefined;
  readonly startDate: string | undefined;
  readonly endDate: string | undefined;
  readonly operationIndex: number;
};

export type WorkflowTraceFacts = {
  readonly companyCodes: readonly string[];
  readonly companyCodeDiscoveries: readonly WorkflowCompanyCodeFact[];
  readonly filings: readonly WorkflowFilingFact[];
  readonly reportSearches: readonly WorkflowReportSearchFact[];
  readonly viewedReceipts: readonly string[];
  readonly tocs: readonly WorkflowTocFact[];
  readonly sectionCitations: readonly WorkflowSectionCitation[];
  readonly successfulOperations: readonly string[];
};

export type WorkflowTraceAssertion = {
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly facts: WorkflowTraceFacts;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecord = (
  value: JsonRecord | undefined,
  key: string,
): JsonRecord | undefined => {
  const child = value?.[key];
  return isRecord(child) ? child : undefined;
};

const getArray = (
  value: JsonRecord | undefined,
  key: string,
): readonly unknown[] | undefined => {
  const child = value?.[key];
  return Array.isArray(child) ? child : undefined;
};

const getString = (
  value: JsonRecord | undefined,
  key: string,
): string | undefined => {
  const child = value?.[key];
  return typeof child === "string" ? child : undefined;
};

const parseJsonObject = (text: string): JsonRecord | undefined => {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const collectTocIds = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  const id = getString(value, "id");
  const ids = id === undefined ? [] : [id];
  const children = getArray(value, "children") ?? [];

  for (const child of children) {
    ids.push(...collectTocIds(child));
  }

  return ids;
};

export const normalizeWorkflowSectionTitle = (
  title: string | undefined,
): string | undefined =>
  title === undefined
    ? undefined
    : title.replace(/[\s\p{P}\p{S}]+/gu, "").toLowerCase();

const getInputArgv = (execution: ToolExecution): readonly string[] | undefined => {
  if (execution.toolName !== "run_darty_cli" || !isRecord(execution.input)) {
    return undefined;
  }

  const argv = execution.input.argv;
  return Array.isArray(argv) && argv.every((item) => typeof item === "string")
    ? argv
    : undefined;
};

const parseExecution = (
  execution: ToolExecution,
): { readonly argv: readonly string[]; readonly parsed: ParsedWorkflowOperation; readonly envelope: JsonRecord } | undefined => {
  const argv = getInputArgv(execution);
  if (argv === undefined || execution.exitCode !== 0) {
    return undefined;
  }

  const validation = validateWorkflowCliArgv(argv);
  if (!validation.ok || validation.parsed.kind !== "operation") {
    return undefined;
  }

  const envelope = parseJsonObject(execution.stdout);
  if (envelope === undefined) {
    return undefined;
  }

  return { argv, parsed: validation.parsed, envelope };
};

const getAuthoritativeReceiptFromResult = (
  result: JsonRecord | undefined,
): string | undefined =>
  getString(getRecord(result, "receipt"), "receiptNumber");

const addUnique = (values: string[], value: string | undefined): void => {
  if (value !== undefined && !values.includes(value)) {
    values.push(value);
  }
};

const parseWorkflowDateKey = (
  value: string | undefined,
  format: "compact" | "iso",
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const pattern = format === "compact" ? /^\d{8}$/u : /^\d{4}-\d{2}-\d{2}$/u;
  if (!pattern.test(value)) {
    return undefined;
  }

  const compact = value.replace(/-/gu, "");
  const year = Number.parseInt(compact.slice(0, 4), 10);
  const month = Number.parseInt(compact.slice(4, 6), 10);
  const day = Number.parseInt(compact.slice(6, 8), 10);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  return month >= 1 && month <= 12 && day >= 1 && day <= (daysInMonth ?? 0)
    ? compact
    : undefined;
};

const buildTraceFacts = (
  toolExecutions: readonly ToolExecution[],
  reasons: string[],
): WorkflowTraceFacts => {
  const companyCodes: string[] = [];
  const companyCodeDiscoveries: WorkflowCompanyCodeFact[] = [];
  const filings: WorkflowFilingFact[] = [];
  const reportSearches: WorkflowReportSearchFact[] = [];
  const viewedReceipts: string[] = [];
  const tocs: WorkflowTocFact[] = [];
  const sectionCitations: WorkflowSectionCitation[] = [];
  const successfulOperations: string[] = [];

  for (const [operationIndex, execution] of toolExecutions.entries()) {
    const parsedExecution = parseExecution(execution);
    if (parsedExecution === undefined) {
      continue;
    }

    const { parsed, envelope } = parsedExecution;
    const result = getRecord(envelope, "result");
    addUnique(successfulOperations, parsed.operation);

    if (parsed.operation === "search-company") {
      for (const item of getArray(result, "items") ?? []) {
        const companyCode = getString(
          isRecord(item) ? item : undefined,
          "companyCode",
        );
        addUnique(companyCodes, companyCode);
        if (companyCode !== undefined) {
          companyCodeDiscoveries.push({ companyCode, operationIndex });
        }
      }
      continue;
    }

    if (parsed.operation === "search-company-reports") {
      reportSearches.push({
        companyCode: getString(parsed.options, "companyCode"),
        startDate: getString(parsed.options, "startDate"),
        endDate: getString(parsed.options, "endDate"),
        operationIndex,
      });
      for (const item of getArray(result, "items") ?? []) {
        const itemRecord = isRecord(item) ? item : undefined;
        const filingRecord = getRecord(itemRecord, "filing");
        const companyRecord = getRecord(itemRecord, "company");
        const receiptNumber =
          getString(itemRecord, "receiptNumber") ??
          getString(filingRecord, "receiptNumber");
        if (receiptNumber === undefined) {
          reasons.push(
            "search-company-reports returned a filing without authoritative receiptNumber",
          );
          continue;
        }
        filings.push({
          receiptNumber,
          companyCode:
            getString(itemRecord, "companyCode") ??
            getString(companyRecord, "companyCode"),
          reportTitle:
            getString(itemRecord, "reportTitle") ??
            getString(filingRecord, "reportTitle"),
          receiptDate:
            getString(itemRecord, "receiptDate") ??
            getString(filingRecord, "receiptDate"),
        });
      }
      continue;
    }

    const receiptNumber = getAuthoritativeReceiptFromResult(result);
    if (receiptNumber === undefined) {
      reasons.push(
        "view-report succeeded without authoritative result.receipt.receiptNumber",
      );
      continue;
    }
    addUnique(viewedReceipts, receiptNumber);

    const toc = getArray(result, "toc");
    if (toc !== undefined) {
      const sectionIds = toc.flatMap((entry) => collectTocIds(entry));
      if (sectionIds.length > 0) {
        tocs.push({ receiptNumber, sectionIds });
      }
    }

    const content = getRecord(result, "content");
    const section = getRecord(content, "section");
    const sectionId = getString(section, "id");
    const sectionTitle = getString(section, "title");
    const body = getString(content, "body");

    if (body !== undefined && body.trim().length > 0) {
      if (sectionId === undefined) {
        reasons.push(
          `view-report receipt ${receiptNumber} returned section content without authoritative content.section.id`,
        );
        continue;
      }
      if (sectionTitle === undefined) {
        reasons.push(
          `view-report receipt ${receiptNumber} returned section content without authoritative content.section.title`,
        );
        continue;
      }
      sectionCitations.push({
        receiptNumber,
        sectionId,
        sectionTitle,
        bodyExcerpt: body.slice(0, 1_200),
      });
    }
  }

  return {
    companyCodes,
    companyCodeDiscoveries,
    filings,
    reportSearches,
    viewedReceipts,
    tocs,
    sectionCitations,
    successfulOperations,
  };
};

const assertCommonWorkflow = (
  scenario: AgentWorkflowScenario,
  facts: WorkflowTraceFacts,
  reasons: string[],
): void => {
  for (const operation of [
    "search-company",
    "search-company-reports",
    "view-report",
  ]) {
    if (!facts.successfulOperations.includes(operation)) {
      reasons.push(`agent did not complete a successful ${operation} call`);
    }
  }

  if (!facts.companyCodes.includes("00126380")) {
    reasons.push(`workflow did not resolve Samsung Electronics companyCode ${samsungCompanyCode}`);
  }

  for (const reportSearch of facts.reportSearches) {
    const discoveredEarlier = facts.companyCodeDiscoveries.some(
      (discovery) =>
        discovery.companyCode === reportSearch.companyCode &&
        discovery.operationIndex < reportSearch.operationIndex,
    );

    if (!discoveredEarlier) {
      reasons.push(
        `search-company-reports companyCode ${reportSearch.companyCode ?? "<missing>"} was not returned by an earlier successful search-company call`,
      );
    }
  }

  if (facts.filings.length === 0) {
    reasons.push("workflow did not return a filing receiptNumber");
  }

  const startDate = parseWorkflowDateKey(scenario.startDate, "compact");
  const endDate = parseWorkflowDateKey(scenario.endDate, "compact");
  if (startDate === undefined || endDate === undefined || startDate > endDate) {
    reasons.push(
      `scenario has an invalid required filing date range: ${scenario.startDate}–${scenario.endDate}`,
    );
  } else {
    for (const reportSearch of facts.reportSearches) {
      if (
        reportSearch.startDate !== scenario.startDate ||
        reportSearch.endDate !== scenario.endDate
      ) {
        reasons.push(
          `search-company-reports date range ${reportSearch.startDate ?? "<missing>"}–${reportSearch.endDate ?? "<missing>"} did not match required range ${scenario.startDate}–${scenario.endDate}`,
        );
      }
    }

    for (const filing of facts.filings) {
      const receiptDate = parseWorkflowDateKey(filing.receiptDate, "iso");
      if (receiptDate === undefined) {
        reasons.push(
          `filing ${filing.receiptNumber} did not return a valid receiptDate in YYYY-MM-DD format`,
        );
      } else if (receiptDate < startDate || receiptDate > endDate) {
        reasons.push(
          `filing ${filing.receiptNumber} receiptDate ${filing.receiptDate} was outside required range ${scenario.startDate}–${scenario.endDate}`,
        );
      }
    }
  }

  for (const filing of facts.filings) {
    if (filing.companyCode !== samsungCompanyCode) {
      reasons.push(
        `filing ${filing.receiptNumber} did not return Samsung companyCode ${samsungCompanyCode}`,
      );
    }
  }

  const filingReceipts = new Set(facts.filings.map((filing) => filing.receiptNumber));
  for (const receiptNumber of facts.viewedReceipts) {
    if (!filingReceipts.has(receiptNumber)) {
      reasons.push(
        `view-report receipt ${receiptNumber} was not returned by search-company-reports`,
      );
    }
  }

  if (facts.tocs.length === 0) {
    reasons.push("workflow did not retrieve a non-empty report TOC");
  }
};

const assertExactSectionCitations = (
  facts: WorkflowTraceFacts,
  reasons: string[],
): void => {
  if (facts.sectionCitations.length === 0) {
    reasons.push("workflow did not retrieve a non-empty report section body");
    return;
  }

  const everyCitationHasTocMatch = facts.sectionCitations.every((citation) =>
    facts.tocs.some(
      (toc) =>
        toc.receiptNumber === citation.receiptNumber &&
        toc.sectionIds.includes(citation.sectionId),
    ),
  );
  if (!everyCitationHasTocMatch) {
    reasons.push(
      "every retrieved section citation must pair its sectionId with the TOC returned for the same receiptNumber",
    );
  }
};

const assertRelatedFilingsComparison = (
  facts: WorkflowTraceFacts,
  reasons: string[],
): void => {
  const filingReceipts = [...new Set(facts.filings.map((filing) => filing.receiptNumber))];
  if (filingReceipts.length < 2) {
    reasons.push("comparison workflow did not return two distinct filing receiptNumbers");
  }

  const sectionReceipts = [...new Set(facts.sectionCitations.map((citation) => citation.receiptNumber))];
  if (sectionReceipts.length < 2) {
    reasons.push("comparison workflow did not retrieve sections from two distinct receipts");
  }

  const hasTocMatchForEverySection = facts.sectionCitations.every((citation) =>
    facts.tocs.some(
      (toc) =>
        toc.receiptNumber === citation.receiptNumber &&
        toc.sectionIds.includes(citation.sectionId),
    ),
  );
  if (!hasTocMatchForEverySection) {
    reasons.push(
      "each comparison section citation must use a sectionId returned by that receipt's TOC",
    );
  }

  const comparableTitles = facts.sectionCitations
    .map((citation) => normalizeWorkflowSectionTitle(citation.sectionTitle))
    .filter((title): title is string => title !== undefined && title.length > 0);
  if (comparableTitles.length < 2) {
    reasons.push("comparison workflow did not return section titles for both evidence sections");
  } else if (new Set(comparableTitles).size !== 1) {
    reasons.push(
      "comparison workflow must use the same normalized section title for every evidence section",
    );
  }
};

export const evaluateWorkflowTrace = (
  scenario: AgentWorkflowScenario,
  toolExecutions: readonly ToolExecution[],
): WorkflowTraceAssertion => {
  const reasons: string[] = [];
  const facts = buildTraceFacts(toolExecutions, reasons);

  if (toolExecutions.length === 0) {
    reasons.push("agent never called the structured local CLI runner");
  }

  assertCommonWorkflow(scenario, facts, reasons);
  if (scenario.kind === "exact-section-citation") {
    assertExactSectionCitations(facts, reasons);
  } else {
    assertRelatedFilingsComparison(facts, reasons);
  }

  return { pass: reasons.length === 0, reasons, facts };
};

export const summarizeWorkflowFacts = (facts: WorkflowTraceFacts): string =>
  JSON.stringify(facts, null, 2);
