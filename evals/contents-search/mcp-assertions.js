const expectedViewerPrefix = "https://dart.fss.or.kr/dsaf001/main.do?";

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const toOutputText = (output) =>
  typeof output === "string" ? output.trim() : JSON.stringify(output);

const parseEnvelopeCandidate = (candidate) => {
  const parsed = parseJson(candidate);

  if (Array.isArray(parsed)) {
    for (const block of parsed) {
      if (block?.type === "text" && typeof block.text === "string") {
        const inner = parseJson(block.text);
        if (inner?.result && inner?.metadata && inner?.references) {
          return inner;
        }
      }
    }
  }

  if (parsed?.result && parsed?.metadata && parsed?.references) {
    return parsed;
  }

  return undefined;
};

const extractEnvelope = (output) => {
  const text = toOutputText(output);
  const candidates = [
    text,
    text.replace(/^MCP Tool Result \([^)]+\):\s*/, ""),
  ];

  for (const candidate of candidates) {
    const envelope = parseEnvelopeCandidate(candidate);
    if (envelope !== undefined) {
      return { text, envelope };
    }
  }

  return { text, envelope: undefined };
};

const getExpectedVars = (context) => ({
  expectedFound: context.vars.expectedFound === true || context.vars.expectedFound === "true",
  expectedKeyword: String(context.vars.expectedKeyword),
  expectedStartDate: String(context.vars.expectedStartDate),
  expectedEndDate: String(context.vars.expectedEndDate),
  expectedCompanyCode: String(context.vars.expectedCompanyCode ?? ""),
  expectedReferencePrefix: String(
    context.vars.expectedReferencePrefix ?? expectedViewerPrefix,
  ),
});

export const assertStructuredEnvelope = (output) => {
  const { text, envelope } = extractEnvelope(output);
  const hasToolWrapper = /MCP Tool Result \(contents-search\)/.test(text);
  const pass = envelope !== undefined;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: `hasStructuredEnvelope=${envelope !== undefined}, promptfooToolWrapperPresent=${hasToolWrapper}, outputLength=${text.length}`,
  };
};

export const assertContentsSearchFacts = (output, context) => {
  const { text, envelope } = extractEnvelope(output);
  const {
    expectedFound,
    expectedKeyword,
    expectedStartDate,
    expectedEndDate,
    expectedCompanyCode,
    expectedReferencePrefix,
  } = getExpectedVars(context);

  if (envelope === undefined) {
    return {
      pass: false,
      score: 0,
      reason: "Expected a structured contents-search envelope but could not parse one.",
    };
  }

  const request = envelope.result?.request;
  const hasExpectedRequest =
    request?.keyword === expectedKeyword &&
    request?.startDate === expectedStartDate &&
    request?.endDate === expectedEndDate;
  const hasExpectedCompanyFilter =
    expectedCompanyCode === ""
      ? request?.companyCode === undefined
      : request?.companyCode === expectedCompanyCode;
  const hasNoUnexpectedPresenterFilter = request?.presenterName === undefined;
  const hasNoUnexpectedReportFilter = request?.reportName === undefined;
  const hasNoUnexpectedNarrowingFilters =
    hasExpectedCompanyFilter &&
    hasNoUnexpectedPresenterFilter &&
    hasNoUnexpectedReportFilter;
  const pagination = envelope.result?.pagination;
  const items = envelope.result?.items;
  const firstItem = Array.isArray(items) ? items[0] : undefined;
  const viewerUrl = firstItem?.references?.viewerUrl;
  const receiptNumber = firstItem?.filing?.receiptNumber;
  const snippetText = firstItem?.match?.snippetText;

  if (expectedFound) {
    const hasItems = Array.isArray(items) && items.length > 0;
    const hasPositiveCount =
      pagination?.totalCount > 0 && pagination?.returnedCount > 0;
    const hasViewerUrl =
      typeof viewerUrl === "string" &&
      viewerUrl.startsWith(expectedReferencePrefix);
    const hasReceiptNumber =
      typeof receiptNumber === "string" && /^20\d{12}$/.test(receiptNumber);
    const hasSnippet = typeof snippetText === "string" && snippetText.length > 0;
    const allItemsMatchCompanyFilter =
      expectedCompanyCode === "" ||
      (Array.isArray(items) &&
        items.every((item) => item?.company?.companyCode === expectedCompanyCode));
    const pass =
      hasExpectedRequest &&
      hasNoUnexpectedNarrowingFilters &&
      allItemsMatchCompanyFilter &&
      hasItems &&
      hasPositiveCount &&
      hasViewerUrl &&
      hasReceiptNumber &&
      hasSnippet;

    return {
      pass,
      score: pass ? 1 : 0,
      reason: `Expected populated result. hasExpectedRequest=${hasExpectedRequest}, hasNoUnexpectedNarrowingFilters=${hasNoUnexpectedNarrowingFilters}, allItemsMatchCompanyFilter=${allItemsMatchCompanyFilter}, hasItems=${hasItems}, hasPositiveCount=${hasPositiveCount}, hasViewerUrl=${hasViewerUrl}, hasReceiptNumber=${hasReceiptNumber}, hasSnippet=${hasSnippet}`,
    };
  }

  const hasEmptyItems = Array.isArray(items) && items.length === 0;
  const hasZeroCount =
    pagination?.totalCount === 0 && pagination?.returnedCount === 0;
  const hasViewerReference = text.includes(expectedReferencePrefix);
  const hasReceiptReference = /\b20\d{12}\b/.test(text);
  const pass =
    hasExpectedRequest &&
    hasNoUnexpectedNarrowingFilters &&
    hasEmptyItems &&
    hasZeroCount &&
    !hasViewerReference &&
    !hasReceiptReference;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: `Expected empty result. hasExpectedRequest=${hasExpectedRequest}, hasNoUnexpectedNarrowingFilters=${hasNoUnexpectedNarrowingFilters}, hasEmptyItems=${hasEmptyItems}, hasZeroCount=${hasZeroCount}, hasViewerReference=${hasViewerReference}, hasReceiptReference=${hasReceiptReference}`,
  };
};
