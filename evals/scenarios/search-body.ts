export type SearchBodyScenario = {
  readonly id: string;
  readonly description: string;
  readonly expectedFound: boolean;
  readonly keyword: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly companyCode?: string;
  readonly fixedCli?: {
    readonly argv: readonly string[];
  };
  readonly prompts: {
    readonly cliAgent: string;
    readonly typedAgent: string;
    readonly pi: string;
  };
};

export const searchBodyScenarios = [
  {
    id: "populated-live-search",
    description: "populated live search returns one or more filing references",
    expectedFound: true,
    keyword: "배당",
    startDate: "20250331",
    endDate: "20260331",
    fixedCli: {
      argv: [
        "search-body",
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ],
    },
    prompts: {
      cliAgent: `Use the local darty CLI to search DART filing contents for the keyword "배당" between 20250331 and 20260331.`,
      typedAgent: `Use the local darty tools to search DART filing contents for the keyword "배당" between 20250331 and 20260331.`,
      pi: `Use the darty Pi tool to search DART filing contents for the keyword "배당" between 20250331 and 20260331.`,
    },
  },
  {
    id: "explicit-no-result-search",
    description: "explicit no-result search returns an empty result without invented references",
    expectedFound: false,
    keyword: "unlikely-darty-eval-keyword-20260404",
    startDate: "20250331",
    endDate: "20260331",
    fixedCli: {
      argv: [
        "search-body",
        "--keyword",
        "unlikely-darty-eval-keyword-20260404",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
      ],
    },
    prompts: {
      cliAgent: `Use the local darty CLI to search DART filing contents for the keyword "unlikely-darty-eval-keyword-20260404" between 20250331 and 20260331.`,
      typedAgent: `Use the local darty tools to search DART filing contents for the keyword "unlikely-darty-eval-keyword-20260404" between 20250331 and 20260331.`,
      pi: `Use the darty Pi tool to search DART filing contents for the keyword "unlikely-darty-eval-keyword-20260404" between 20250331 and 20260331. Do not invent filing references if no results are returned.`,
    },
  },
  {
    id: "company-code-filtered-search",
    description: "filtered live search honors Samsung Electronics company code",
    expectedFound: true,
    keyword: "배당",
    startDate: "20250331",
    endDate: "20260331",
    companyCode: "00126380",
    fixedCli: {
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
    },
    prompts: {
      cliAgent: `Use the local darty CLI to search DART filing contents for Samsung Electronics filings matching the keyword "배당" between 20250331 and 20260331. Use DART company code 00126380 as the company-code filter.`,
      typedAgent: `Use the local darty tools to search DART filing contents for Samsung Electronics filings matching the keyword "배당" between 20250331 and 20260331. Use DART company code 00126380 as the company-code filter.`,
      pi: `Use the darty Pi tool to search DART filing contents for Samsung Electronics filings matching the keyword "배당" between 20250331 and 20260331. Use DART company code 00126380 as the company-code filter.`,
    },
  },
] as const satisfies readonly SearchBodyScenario[];
