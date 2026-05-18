export type SearchBodyCliScenario = {
  readonly id: string;
  readonly description: string;
  readonly expectedFound: boolean;
  readonly keyword: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly companyCode?: string;
  readonly argv: readonly string[];
  readonly task: string;
  readonly agentNativeTask: string;
};

export const searchBodyCliScenarios = [
  {
    id: "populated-live-search",
    description: "populated live search returns one or more filing references",
    expectedFound: true,
    keyword: "배당",
    startDate: "20250331",
    endDate: "20260331",
    argv: [
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
    ],
    task: `Use the local darty CLI to search DART filing contents for the keyword "배당" between 20250331 and 20260331.`,
    agentNativeTask: `Use the local darty tools to search DART filing contents for the keyword "배당" between 20250331 and 20260331.`,
  },
  {
    id: "explicit-no-result-search",
    description: "explicit no-result search returns an empty result without invented references",
    expectedFound: false,
    keyword: "unlikely-darty-eval-keyword-20260404",
    startDate: "20250331",
    endDate: "20260331",
    argv: [
      "search-body",
      "--keyword",
      "unlikely-darty-eval-keyword-20260404",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
    ],
    task: `Use the local darty CLI to search DART filing contents for the keyword "unlikely-darty-eval-keyword-20260404" between 20250331 and 20260331.`,
    agentNativeTask: `Use the local darty tools to search DART filing contents for the keyword "unlikely-darty-eval-keyword-20260404" between 20250331 and 20260331.`,
  },
  {
    id: "company-code-filtered-search",
    description: "filtered live search honors Samsung Electronics company code",
    expectedFound: true,
    keyword: "배당",
    startDate: "20250331",
    endDate: "20260331",
    companyCode: "00126380",
    argv: [
      "search-body",
      "--keyword",
      "배당",
      "--start-date",
      "20250331",
      "--end-date",
      "20260331",
      "--company-code",
      "00126380",
    ],
    task: `Use the local darty CLI to search DART filing contents for Samsung Electronics filings matching the keyword "배당" between 20250331 and 20260331. Use DART company code 00126380 as the company-code filter.`,
    agentNativeTask: `Use the local darty tools to search DART filing contents for Samsung Electronics filings matching the keyword "배당" between 20250331 and 20260331. Use DART company code 00126380 as the company-code filter.`,
  },
] as const satisfies readonly SearchBodyCliScenario[];
