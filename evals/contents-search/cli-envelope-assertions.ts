import type { ContentsSearchCliScenario } from "./cli-scenarios.ts";

export type ContentsSearchEnvelopeFacts = {
  readonly receiptNumber: string | undefined;
  readonly viewerUrl: string | undefined;
  readonly receiptNumbers: readonly string[];
  readonly viewerUrls: readonly string[];
  readonly companyName: string | undefined;
  readonly reportTitle: string | undefined;
};

export type ScenarioAssertionResult = {
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly facts: ContentsSearchEnvelopeFacts;
};

const expectedViewerPrefix = "https://dart.fss.or.kr/dsaf001/main.do?";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecord = (
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined => {
  const child = value[key];
  return isRecord(child) ? child : undefined;
};

const getString = (
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const child = value?.[key];
  return typeof child === "string" ? child : undefined;
};

const getNumber = (
  value: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const child = value?.[key];
  return typeof child === "number" ? child : undefined;
};

const getArray = (
  value: Record<string, unknown> | undefined,
  key: string,
): readonly unknown[] | undefined => {
  const child = value?.[key];
  return Array.isArray(child) ? child : undefined;
};

export const parseJsonObject = (text: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(text);

  if (!isRecord(parsed)) {
    throw new Error("Expected CLI stdout to be a JSON object.");
  }

  return parsed;
};

export const assertContentsSearchEnvelope = (
  envelope: Record<string, unknown>,
  scenario: ContentsSearchCliScenario,
): ScenarioAssertionResult => {
  const reasons: string[] = [];
  const result = getRecord(envelope, "result");
  const metadata = getRecord(envelope, "metadata");
  const references = getRecord(envelope, "references");
  const request = result === undefined ? undefined : getRecord(result, "request");
  const pagination =
    result === undefined ? undefined : getRecord(result, "pagination");
  const items = getArray(result, "items");
  const firstItem = isRecord(items?.[0]) ? items[0] : undefined;
  const firstCompany =
    firstItem === undefined ? undefined : getRecord(firstItem, "company");
  const firstFiling =
    firstItem === undefined ? undefined : getRecord(firstItem, "filing");
  const firstMatch =
    firstItem === undefined ? undefined : getRecord(firstItem, "match");
  const firstReferences =
    firstItem === undefined ? undefined : getRecord(firstItem, "references");

  const itemRecords = (items ?? []).filter(isRecord);
  const receiptNumbers = itemRecords
    .map((item) => getString(getRecord(item, "filing"), "receiptNumber"))
    .filter((value): value is string => value !== undefined);
  const viewerUrls = itemRecords
    .map((item) => getString(getRecord(item, "references"), "viewerUrl"))
    .filter((value): value is string => value !== undefined);
  const receiptNumber = getString(firstFiling, "receiptNumber");
  const viewerUrl = getString(firstReferences, "viewerUrl");
  const companyName = getString(firstCompany, "name");
  const reportTitle = getString(firstFiling, "reportTitle");

  if (result === undefined) {
    reasons.push("missing result object");
  }
  if (metadata === undefined) {
    reasons.push("missing metadata object");
  }
  if (references === undefined) {
    reasons.push("missing references object");
  }

  if (getString(request, "keyword") !== scenario.keyword) {
    reasons.push("request keyword does not match scenario");
  }
  if (getString(request, "startDate") !== scenario.startDate) {
    reasons.push("request startDate does not match scenario");
  }
  if (getString(request, "endDate") !== scenario.endDate) {
    reasons.push("request endDate does not match scenario");
  }
  if (
    scenario.companyCode !== undefined &&
    getString(request, "companyCode") !== scenario.companyCode
  ) {
    reasons.push("request companyCode does not match scenario");
  }

  if (!Array.isArray(items)) {
    reasons.push("result items is not an array");
  }

  if (scenario.expectedFound) {
    const totalCount = getNumber(pagination, "totalCount");
    const returnedCount = getNumber(pagination, "returnedCount");
    const snippetText = getString(firstMatch, "snippetText");
    const allItemsMatchCompanyFilter =
      scenario.companyCode === undefined ||
      (items ?? []).every((item) => {
        if (!isRecord(item)) {
          return false;
        }
        const company = getRecord(item, "company");
        return getString(company, "companyCode") === scenario.companyCode;
      });

    if ((items?.length ?? 0) === 0) {
      reasons.push("expected at least one item");
    }
    if (typeof totalCount !== "number" || totalCount <= 0) {
      reasons.push("expected positive totalCount");
    }
    if (typeof returnedCount !== "number" || returnedCount <= 0) {
      reasons.push("expected positive returnedCount");
    }
    if (viewerUrl === undefined || !viewerUrl.startsWith(expectedViewerPrefix)) {
      reasons.push("missing DART viewer URL on first item");
    }
    if (receiptNumber === undefined || !/^20\d{12}$/.test(receiptNumber)) {
      reasons.push("missing receipt number on first item");
    }
    if (snippetText === undefined || snippetText.length === 0) {
      reasons.push("missing snippet text on first item");
    }
    if (!allItemsMatchCompanyFilter) {
      reasons.push("not all items match expected companyCode filter");
    }
  } else {
    const envelopeText = JSON.stringify(envelope);

    if ((items?.length ?? -1) !== 0) {
      reasons.push("expected empty items array");
    }
    if (getNumber(pagination, "totalCount") !== 0) {
      reasons.push("expected totalCount to be zero");
    }
    if (getNumber(pagination, "returnedCount") !== 0) {
      reasons.push("expected returnedCount to be zero");
    }
    if (envelopeText.includes(expectedViewerPrefix)) {
      reasons.push("empty result should not include a filing viewer URL");
    }
    if (/\b20\d{12}\b/.test(envelopeText)) {
      reasons.push("empty result should not include a receipt number");
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    facts: {
      receiptNumber,
      viewerUrl,
      receiptNumbers,
      viewerUrls,
      companyName,
      reportTitle,
    },
  };
};
