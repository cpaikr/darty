export type WorkflowScenario = {
  readonly id: string;
  readonly description: string;
  readonly task: string;
  readonly companySearch?: {
    readonly companyName: string;
    readonly expectedCompanyCode: string;
  };
  readonly companyReports?: {
    readonly companyCode: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly expectedItems: "non_empty" | "empty";
    readonly reportNameIncludes?: string;
    readonly requireAnnualReportFilter?: boolean;
    readonly requireDescendingDateOrder?: boolean;
    readonly forbidViewReportWhenEmpty?: boolean;
  };
  readonly bodySearch?: {
    readonly keyword: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly companyCode?: string;
    readonly expectedItems: "non_empty" | "empty";
  };
  readonly viewReport?: {
    readonly source: "companyReports" | "bodySearch";
    readonly requireSectionFollowup?: boolean;
    readonly requireFirstSourceItem?: boolean;
  };
};

const commonStartDate = "20250331";
const commonEndDate = "20260331";
const samsungElectronics = {
  name: "삼성전자",
  companyCode: "00126380",
} as const;

export const workflowScenarios = [
  {
    id: "company-name-to-filing-reference",
    description: "find a company code from a company name, then return a filing reference",
    task: `Find ${samsungElectronics.name}'s DART company code, then search that company's filings between ${commonStartDate} and ${commonEndDate}. Return one filing receipt number or viewer URL from the tool result.`,
    companySearch: {
      companyName: samsungElectronics.name,
      expectedCompanyCode: samsungElectronics.companyCode,
    },
    companyReports: {
      companyCode: samsungElectronics.companyCode,
      startDate: commonStartDate,
      endDate: commonEndDate,
      expectedItems: "non_empty",
    },
  },
  {
    id: "latest-annual-report-viewer-reference",
    description: "find the latest annual report for a company name and open its viewer",
    task: `First find ${samsungElectronics.name}'s DART company code, then find that company's latest annual report between 20240101 and ${commonEndDate}. Open the report viewer and return the viewer reference. Use DART tools rather than guessing identifiers.`,
    companySearch: {
      companyName: samsungElectronics.name,
      expectedCompanyCode: samsungElectronics.companyCode,
    },
    companyReports: {
      companyCode: samsungElectronics.companyCode,
      startDate: "20240101",
      endDate: commonEndDate,
      expectedItems: "non_empty",
      requireAnnualReportFilter: true,
      requireDescendingDateOrder: true,
    },
    viewReport: {
      source: "companyReports",
      requireFirstSourceItem: true,
    },
  },
  {
    id: "annual-report-section-window",
    description: "retrieve a report TOC, then fetch a selected section window",
    task: `First find ${samsungElectronics.name}'s DART company code, then find that company's annual report between 20240101 and ${commonEndDate}. Open the viewer, inspect the returned table of contents, then fetch one specific section window in markdown. Use the section ID returned by darty_view_report, not raw DART viewer parameters.`,
    companySearch: {
      companyName: samsungElectronics.name,
      expectedCompanyCode: samsungElectronics.companyCode,
    },
    companyReports: {
      companyCode: samsungElectronics.companyCode,
      startDate: "20240101",
      endDate: commonEndDate,
      expectedItems: "non_empty",
      requireAnnualReportFilter: true,
    },
    viewReport: {
      source: "companyReports",
      requireSectionFollowup: true,
    },
  },
  {
    id: "body-search-open-matching-filing",
    description: "search body text, open a matching filing, and use the returned filing reference",
    task: `Search DART filing body text for ${samsungElectronics.name} filings matching the keyword "배당" between ${commonStartDate} and ${commonEndDate}. Use DART company code ${samsungElectronics.companyCode}. Then open one matching filing viewer using the receipt or viewer URL returned by the search.`,
    bodySearch: {
      keyword: "배당",
      startDate: commonStartDate,
      endDate: commonEndDate,
      companyCode: samsungElectronics.companyCode,
      expectedItems: "non_empty",
    },
    viewReport: {
      source: "bodySearch",
    },
  },
  {
    id: "no-result-does-not-invent-reference",
    description: "confirm a no-result company filing search without inventing references",
    task: `Find ${samsungElectronics.name}'s DART company code, then confirm whether it has company-specific filings titled "unlikely-darty-eval-keyword-20260404" between ${commonStartDate} and ${commonEndDate}. Do not invent a filing reference if the tool returns no results.`,
    companySearch: {
      companyName: samsungElectronics.name,
      expectedCompanyCode: samsungElectronics.companyCode,
    },
    companyReports: {
      companyCode: samsungElectronics.companyCode,
      startDate: commonStartDate,
      endDate: commonEndDate,
      reportNameIncludes: "unlikely-darty-eval-keyword-20260404",
      expectedItems: "empty",
      forbidViewReportWhenEmpty: true,
    },
  },
] as const satisfies readonly WorkflowScenario[];
