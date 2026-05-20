import type { ToolExecution } from "../../search-body/agent-native/types.ts";
import type { WorkflowScenario } from "./scenarios.ts";

type IndexedExecution = {
  readonly index: number;
  readonly execution: ToolExecution;
};

type FilingReference = {
  readonly receiptNumber: string;
  readonly viewerUrl?: string;
};

type TocNode = {
  readonly id: string;
  readonly title: string;
  readonly children?: readonly TocNode[];
};

type EvaluationOptions = {
  readonly finalAnswer?: string;
};

const DART_VIEWER_URL_PATTERN = /https?:\/\/[^\s"'<>)]*dart\.fss\.or\.kr\/dsaf001\/main\.do[^\s"'<>)]*/i;
const RCP_NO_PARAMETER_PATTERN = /\brcpNo\s*=\s*20\d{12}\b/i;
const STANDALONE_RECEIPT_NUMBER_PATTERN = /(^|[^\d])20\d{12}(?!\d)/;

const containsFilingReference = (value: string | undefined): boolean =>
  value !== undefined &&
  (DART_VIEWER_URL_PATTERN.test(value) ||
    RCP_NO_PARAMETER_PATTERN.test(value) ||
    STANDALONE_RECEIPT_NUMBER_PATTERN.test(value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getStringProperty = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const child = value[key];
  return typeof child === "string" ? child : undefined;
};

const getStringArrayProperty = (
  value: Record<string, unknown>,
  key: string,
): readonly string[] | undefined => {
  const child = value[key];
  return Array.isArray(child) && child.every((item) => typeof item === "string")
    ? child
    : undefined;
};

const getNumberProperty = (
  value: Record<string, unknown>,
  key: string,
): number | undefined => {
  const child = value[key];
  return typeof child === "number" ? child : undefined;
};

const parseJsonObject = (json: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) {
    throw new Error("stdout JSON was not an object");
  }
  return parsed;
};

const parseExecutionEnvelope = (
  execution: ToolExecution,
): Record<string, unknown> | undefined => {
  if (execution.stdout.length === 0) {
    return undefined;
  }
  return parseJsonObject(execution.stdout);
};

const resultObject = (
  envelope: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  const result = envelope?.result;
  return isRecord(result) ? result : undefined;
};

const resultItems = (
  envelope: Record<string, unknown> | undefined,
): readonly unknown[] | undefined => {
  const items = resultObject(envelope)?.items;
  return Array.isArray(items) ? items : undefined;
};

const assertToolSucceeded = (
  reasons: string[],
  execution: ToolExecution,
): Record<string, unknown> | undefined => {
  if (execution.exitCode !== 0) {
    reasons.push(`${execution.toolName} exited with ${execution.exitCode}: ${execution.stderr}`);
    return undefined;
  }

  try {
    return parseExecutionEnvelope(execution);
  } catch (error) {
    reasons.push(
      `${execution.toolName} did not return parseable JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
};

const inputRecord = (execution: ToolExecution): Record<string, unknown> | undefined =>
  isRecord(execution.input) ? execution.input : undefined;

const findExecutions = (
  toolExecutions: readonly ToolExecution[],
  toolName: ToolExecution["toolName"],
): readonly IndexedExecution[] =>
  toolExecutions.flatMap((execution, index) =>
    execution.toolName === toolName ? [{ index, execution }] : [],
  );

const receiptNumberFromViewReportInput = (
  execution: ToolExecution,
): string | undefined => {
  const input = inputRecord(execution);
  const receipt = input === undefined ? undefined : getStringProperty(input, "receipt");
  return receipt === undefined ? undefined : extractReceiptNumber(receipt);
};

const requireInputStringIncludes = (
  reasons: string[],
  execution: ToolExecution,
  key: string,
  expectedSubstring: string,
): void => {
  const input = inputRecord(execution);
  const actual = input === undefined ? undefined : getStringProperty(input, key);
  if (actual === undefined || !actual.includes(expectedSubstring)) {
    reasons.push(
      `${execution.toolName} expected ${key} to include ${expectedSubstring}, received ${actual ?? "<missing>"}`,
    );
  }
};

const extractReceiptNumber = (value: string): string | undefined => {
  const direct = /^\d{14}$/.exec(value.trim());
  if (direct !== null) {
    return direct[0];
  }

  try {
    const url = new URL(value);
    return url.searchParams.get("rcpNo") ?? undefined;
  } catch {
    return undefined;
  }
};

const companyCodesFromCompanySearch = (
  envelope: Record<string, unknown> | undefined,
): readonly string[] =>
  (resultItems(envelope) ?? []).flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const companyCode = getStringProperty(item, "companyCode");
    return companyCode === undefined ? [] : [companyCode];
  });

const filingReferencesFromItems = (
  envelope: Record<string, unknown> | undefined,
): readonly FilingReference[] =>
  (resultItems(envelope) ?? []).flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.filing)) {
      return [];
    }

    const receiptNumber = getStringProperty(item.filing, "receiptNumber");
    if (receiptNumber === undefined) {
      return [];
    }

    const viewerUrl = isRecord(item.references)
      ? getStringProperty(item.references, "viewerUrl")
      : undefined;

    return [{ receiptNumber, ...(viewerUrl === undefined ? {} : { viewerUrl }) }];
  });

const flattenToc = (nodes: readonly TocNode[]): readonly TocNode[] =>
  nodes.flatMap((node) => [node, ...flattenToc(node.children ?? [])]);

const tocIdsFromViewReport = (
  envelope: Record<string, unknown> | undefined,
): readonly string[] => {
  const toc = resultObject(envelope)?.toc;
  if (!Array.isArray(toc)) {
    return [];
  }

  const nodes = toc.filter(
    (node): node is TocNode =>
      isRecord(node) &&
      typeof node.id === "string" &&
      typeof node.title === "string" &&
      (node.children === undefined || Array.isArray(node.children)),
  );

  return flattenToc(nodes).map((node) => node.id);
};

const assertExpectedItemCount = (
  reasons: string[],
  toolName: string,
  envelope: Record<string, unknown> | undefined,
  expectedItems: "non_empty" | "empty",
): void => {
  const items = resultItems(envelope);
  if (items === undefined) {
    reasons.push(`${toolName} result did not include result.items`);
    return;
  }

  if (expectedItems === "non_empty" && items.length === 0) {
    reasons.push(`${toolName} returned no items`);
  }
  if (expectedItems === "empty" && items.length > 0) {
    reasons.push(`${toolName} returned ${items.length} item(s), expected none`);
  }
};

const findCompanySearch = (
  scenario: WorkflowScenario,
  toolExecutions: readonly ToolExecution[],
  reasons: string[],
): IndexedExecution | undefined => {
  if (scenario.companySearch === undefined) {
    return undefined;
  }

  const candidates = findExecutions(toolExecutions, "darty_search_company");
  const match = candidates.find(({ execution }) => {
    const input = inputRecord(execution);
    return (
      input !== undefined &&
      getStringProperty(input, "companyName") === scenario.companySearch?.companyName
    );
  });

  if (match === undefined) {
    reasons.push(`missing darty_search_company call for ${scenario.companySearch.companyName}`);
    return undefined;
  }

  const envelope = assertToolSucceeded(reasons, match.execution);
  const companyCodes = companyCodesFromCompanySearch(envelope);
  if (!companyCodes.includes(scenario.companySearch.expectedCompanyCode)) {
    reasons.push(
      `darty_search_company result did not include companyCode ${scenario.companySearch.expectedCompanyCode}`,
    );
  }

  return match;
};

const findCompanyReports = (
  scenario: WorkflowScenario,
  toolExecutions: readonly ToolExecution[],
  reasons: string[],
): { readonly indexed: IndexedExecution; readonly envelope: Record<string, unknown> | undefined } | undefined => {
  if (scenario.companyReports === undefined) {
    return undefined;
  }

  const candidates = findExecutions(toolExecutions, "darty_search_company_reports");
  const match = candidates.find(({ execution }) => {
    const input = inputRecord(execution);
    return (
      input !== undefined &&
      getStringProperty(input, "companyCode") === scenario.companyReports?.companyCode &&
      getStringProperty(input, "startDate") === scenario.companyReports?.startDate &&
      getStringProperty(input, "endDate") === scenario.companyReports?.endDate
    );
  });

  if (match === undefined) {
    reasons.push(
      `missing darty_search_company_reports call for companyCode=${scenario.companyReports.companyCode}, startDate=${scenario.companyReports.startDate}, endDate=${scenario.companyReports.endDate}`,
    );
    return undefined;
  }

  if (scenario.companyReports.reportNameIncludes !== undefined) {
    requireInputStringIncludes(
      reasons,
      match.execution,
      "reportName",
      scenario.companyReports.reportNameIncludes,
    );
  }

  if (scenario.companyReports.requireAnnualReportFilter === true) {
    const input = inputRecord(match.execution);
    const reportName = input === undefined ? undefined : getStringProperty(input, "reportName");
    const disclosureTypes =
      input === undefined ? undefined : getStringArrayProperty(input, "disclosureTypes");
    const usesAnnualReportFilter =
      reportName?.includes("사업보고서") === true || disclosureTypes?.includes("A001") === true;

    if (!usesAnnualReportFilter) {
      reasons.push(
        "darty_search_company_reports did not narrow to annual reports with reportName including 사업보고서 or disclosureTypes including A001",
      );
    }
  }

  if (scenario.companyReports.requireDescendingDateOrder === true) {
    const input = inputRecord(match.execution);
    const sortDirection =
      input === undefined ? undefined : getStringProperty(input, "sortDirection");
    const page = input === undefined ? undefined : getNumberProperty(input, "page");

    if (sortDirection !== undefined && sortDirection !== "desc") {
      reasons.push(
        `darty_search_company_reports expected date-desc order for latest report lookup, received sortDirection=${sortDirection}`,
      );
    }
    if (page !== undefined && page !== 1) {
      reasons.push(
        `darty_search_company_reports expected first page for latest report lookup, received page=${page}`,
      );
    }
  }

  const envelope = assertToolSucceeded(reasons, match.execution);
  assertExpectedItemCount(
    reasons,
    "darty_search_company_reports",
    envelope,
    scenario.companyReports.expectedItems,
  );

  return { indexed: match, envelope };
};

const findBodySearch = (
  scenario: WorkflowScenario,
  toolExecutions: readonly ToolExecution[],
  reasons: string[],
): { readonly indexed: IndexedExecution; readonly envelope: Record<string, unknown> | undefined } | undefined => {
  if (scenario.bodySearch === undefined) {
    return undefined;
  }

  const candidates = findExecutions(toolExecutions, "darty_search_body");
  const match = candidates.find(({ execution }) => {
    const input = inputRecord(execution);
    if (input === undefined) {
      return false;
    }

    const companyCodeMatches =
      scenario.bodySearch?.companyCode === undefined ||
      getStringProperty(input, "companyCode") === scenario.bodySearch.companyCode;

    return (
      getStringProperty(input, "keyword") === scenario.bodySearch?.keyword &&
      getStringProperty(input, "startDate") === scenario.bodySearch?.startDate &&
      getStringProperty(input, "endDate") === scenario.bodySearch?.endDate &&
      companyCodeMatches
    );
  });

  if (match === undefined) {
    reasons.push(`missing matching darty_search_body call for keyword=${scenario.bodySearch.keyword}`);
    return undefined;
  }

  const envelope = assertToolSucceeded(reasons, match.execution);
  assertExpectedItemCount(
    reasons,
    "darty_search_body",
    envelope,
    scenario.bodySearch.expectedItems,
  );

  return { indexed: match, envelope };
};

const assertNoViewReportAfterEmptySource = (
  toolExecutions: readonly ToolExecution[],
  source: { readonly indexed: IndexedExecution; readonly envelope: Record<string, unknown> | undefined } | undefined,
  finalAnswer: string | undefined,
  reasons: string[],
): void => {
  if (source === undefined) {
    return;
  }

  const items = resultItems(source.envelope);
  if (items === undefined || items.length > 0) {
    return;
  }

  const downstreamViewReports = findExecutions(toolExecutions, "darty_view_report").filter(
    ({ index }) => index > source.indexed.index,
  );
  if (downstreamViewReports.length > 0) {
    reasons.push(
      "darty_view_report was called after the source search returned no filing references",
    );
  }

  if (containsFilingReference(finalAnswer)) {
    reasons.push(
      "final answer included a filing reference after the source search returned no filing references",
    );
  }
};

const assertViewReport = (
  scenario: WorkflowScenario,
  toolExecutions: readonly ToolExecution[],
  source: { readonly indexed: IndexedExecution; readonly envelope: Record<string, unknown> | undefined } | undefined,
  reasons: string[],
): void => {
  if (scenario.viewReport === undefined || source === undefined) {
    return;
  }

  const sourceReferences = filingReferencesFromItems(source.envelope);
  if (sourceReferences.length === 0) {
    reasons.push(`cannot validate darty_view_report because ${scenario.viewReport.source} returned no filing references`);
    return;
  }

  const downstreamViewReports = findExecutions(toolExecutions, "darty_view_report").filter(
    ({ index }) => index > source.indexed.index,
  );

  if (scenario.viewReport.requireFirstSourceItem === true) {
    const firstSourceReference = sourceReferences[0];
    const firstDownstreamViewReport = downstreamViewReports[0];

    if (firstSourceReference === undefined || firstDownstreamViewReport === undefined) {
      reasons.push("missing darty_view_report call that uses the first filing returned by the source search");
      return;
    }

    const openedReceiptNumber = receiptNumberFromViewReportInput(firstDownstreamViewReport.execution);
    if (openedReceiptNumber !== firstSourceReference.receiptNumber) {
      reasons.push(
        `first darty_view_report call after the source search expected receipt ${firstSourceReference.receiptNumber}, received ${openedReceiptNumber ?? "<missing>"}`,
      );
      return;
    }

    const firstViewEnvelope = assertToolSucceeded(reasons, firstDownstreamViewReport.execution);
    if (scenario.viewReport.requireSectionFollowup !== true) {
      return;
    }

    const tocIds = new Set(tocIdsFromViewReport(firstViewEnvelope));
    if (tocIds.size === 0) {
      reasons.push("first darty_view_report result did not include a table of contents to choose a section from");
      return;
    }
  }

  const sourceReceiptNumbers = new Set(sourceReferences.map((reference) => reference.receiptNumber));
  const viewReports = downstreamViewReports.filter(({ execution }) => {
    const receiptNumber = receiptNumberFromViewReportInput(execution);
    return receiptNumber !== undefined && sourceReceiptNumbers.has(receiptNumber);
  });

  if (viewReports.length === 0) {
    reasons.push("missing darty_view_report call that uses a receipt/viewer URL returned by the source search");
    return;
  }

  const firstView = viewReports[0];
  if (firstView === undefined) {
    reasons.push("missing darty_view_report call that uses a receipt/viewer URL returned by the source search");
    return;
  }

  const firstViewEnvelope = assertToolSucceeded(reasons, firstView.execution);

  if (scenario.viewReport.requireSectionFollowup !== true) {
    return;
  }

  const tocIds = new Set(tocIdsFromViewReport(firstViewEnvelope));
  if (tocIds.size === 0) {
    reasons.push("first darty_view_report result did not include a table of contents to choose a section from");
    return;
  }

  const sectionFollowup = viewReports.slice(1).find(({ execution }) => {
    const input = inputRecord(execution);
    const sectionId = input === undefined ? undefined : getStringProperty(input, "sectionId");
    return sectionId !== undefined && tocIds.has(sectionId);
  });

  if (sectionFollowup === undefined) {
    reasons.push("missing second darty_view_report call with a sectionId returned by the first view-report TOC");
    return;
  }

  const sectionInput = inputRecord(sectionFollowup.execution);
  const outputFormat =
    sectionInput === undefined ? undefined : getStringProperty(sectionInput, "outputFormat");
  if (outputFormat !== undefined && outputFormat !== "markdown") {
    reasons.push(
      `darty_view_report expected outputFormat=markdown or omitted default, received ${outputFormat}`,
    );
  }
  const sectionEnvelope = assertToolSucceeded(reasons, sectionFollowup.execution);
  const content = resultObject(sectionEnvelope)?.content;
  if (!isRecord(content) || getStringProperty(content, "body") === undefined) {
    reasons.push("section darty_view_report result did not include content.body");
  }
};

export const evaluateWorkflowInvocation = (
  scenario: WorkflowScenario,
  toolExecutions: readonly ToolExecution[],
  options?: EvaluationOptions,
): readonly string[] => {
  const reasons: string[] = [];

  if (options !== undefined && options.finalAnswer?.trim().length === 0) {
    reasons.push("agent did not produce a final answer");
  }

  if (toolExecutions.length === 0) {
    reasons.push("agent never called an agent-native darty tool");
    return reasons;
  }

  const failedExecutions = toolExecutions.filter((execution) => execution.exitCode !== 0);
  for (const execution of failedExecutions) {
    reasons.push(`${execution.display} failed with exitCode=${execution.exitCode}: ${execution.stderr}`);
  }

  const companySearch = findCompanySearch(scenario, toolExecutions, reasons);
  const companyReports = findCompanyReports(scenario, toolExecutions, reasons);
  const bodySearch = findBodySearch(scenario, toolExecutions, reasons);

  if (
    companySearch !== undefined &&
    companyReports !== undefined &&
    companySearch.index > companyReports.indexed.index
  ) {
    reasons.push("darty_search_company_reports ran before darty_search_company");
  }

  if (scenario.companyReports?.forbidViewReportWhenEmpty === true) {
    assertNoViewReportAfterEmptySource(
      toolExecutions,
      companyReports,
      options?.finalAnswer,
      reasons,
    );
  }

  assertViewReport(
    scenario,
    toolExecutions,
    scenario.viewReport?.source === "bodySearch" ? bodySearch : companyReports,
    reasons,
  );

  return reasons;
};
