import type { SearchBodyResult } from "../../capabilities/search-body/contract.ts";
import type { SearchCompanyReportsResult } from "../../capabilities/search-company-reports/contract.ts";
import type { SearchCompanyResult } from "../../capabilities/search-company/contract.ts";
import {
  quoteCliValue,
  type CliVerboseOutputOptions,
} from "../command-helpers.ts";

type SearchCliOutputOptions = CliVerboseOutputOptions & {
  readonly agent?: boolean;
};

type SearchEvidenceItem = {
  readonly evidence?: unknown;
};

type SearchResultWithEvidenceItems = {
  readonly result: {
    readonly items: readonly SearchEvidenceItem[];
  };
};

export type SearchCompactCliItem<Item extends SearchEvidenceItem> = Omit<
  Item,
  "evidence"
>;

export type SearchCompactCliResult<Result extends SearchResultWithEvidenceItems> =
  Omit<Result, "result"> & {
    readonly result: Omit<Result["result"], "items"> & {
      readonly items: readonly SearchCompactCliItem<
        Result["result"]["items"][number]
      >[];
    };
  };

type SearchCliResultWithHelp<Result> = Result & {
  readonly help: readonly string[];
};

export type SearchCliResult<Result extends SearchResultWithEvidenceItems> =
  | SearchCliResultWithHelp<Result>
  | SearchCliResultWithHelp<SearchCompactCliResult<Result>>;

type AgentMetadata<Result> = Result extends {
  readonly metadata: infer Metadata;
}
  ? Metadata extends {
      readonly source: infer Source;
      readonly completeness: infer Completeness;
    }
    ? {
        readonly output: "agent";
        readonly source: Source;
        readonly completeness: Completeness;
      }
    : { readonly output: "agent" }
  : { readonly output: "agent" };

type AgentSearchResult<Result, Item> = Result extends {
  readonly result: infer Payload;
  readonly references: infer References;
  readonly warnings: infer Warnings;
}
  ? {
      readonly result: Omit<Payload, "items"> & {
        readonly items: readonly Item[];
      };
      readonly metadata: AgentMetadata<Result>;
      readonly references: References;
      readonly warnings: Warnings;
      readonly help: readonly string[];
    }
  : never;

const omitEvidence = <Item extends SearchEvidenceItem>({
  evidence: _evidence,
  ...item
}: Item): SearchCompactCliItem<Item> => item;

const compactObject = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;

const optionParts = (
  flag: string,
  value: string | number | boolean | undefined,
): readonly string[] => (value === undefined ? [] : [flag, quoteCliValue(value)]);

const defaultedOptionParts = (
  flag: string,
  value: string | number | boolean,
  defaultValue: string | number | boolean,
): readonly string[] =>
  value === defaultValue ? [] : [flag, quoteCliValue(value)];

const booleanFlagPart = (flag: string, enabled: boolean): readonly string[] =>
  enabled ? [flag] : [];

const joinCliCommand = (parts: readonly string[]): string => parts.join(" ");

const toAgentMetadata = <
  Result extends {
    readonly metadata: {
      readonly source?: unknown;
      readonly completeness?: unknown;
    };
  },
>(
  result: Result,
): AgentMetadata<Result> =>
  compactObject({
    output: "agent",
    source: result.metadata.source,
    completeness: result.metadata.completeness,
  }) as AgentMetadata<Result>;

const addHelp = <Result>(result: Result, help: readonly string[]): SearchCliResultWithHelp<Result> => ({
  ...result,
  help,
});

const toSearchCliResult = <Result extends SearchResultWithEvidenceItems>(
  result: Result,
  output: SearchCliOutputOptions,
  help: readonly string[],
): SearchCliResult<Result> => {
  if (output.verbose) {
    return addHelp(result, help);
  }

  return {
    ...result,
    result: {
      ...result.result,
      items: result.result.items.map(omitEvidence),
    },
    help,
  };
};

export type SearchCompanyCompactCliItem = SearchCompactCliItem<
  SearchCompanyResult["result"]["items"][number]
>;

export type SearchCompanyCompactCliResult =
  SearchCompactCliResult<SearchCompanyResult>;

export type SearchCompanyCliResult = SearchCliResult<SearchCompanyResult>;

export type SearchCompanyAgentCliItem = {
  readonly companyCode: string;
  readonly companyName: string;
  readonly stockCode?: string;
  readonly marketKind: SearchCompanyResult["result"]["items"][number]["marketKind"];
  readonly marketLabel?: string;
  readonly detailEndpoint: string;
};

export type SearchCompanyAgentCliResult = AgentSearchResult<
  SearchCompanyResult,
  SearchCompanyAgentCliItem
>;

const toSearchCompanyHelp = (result: SearchCompanyResult): readonly string[] => {
  const [item] = result.result.items;

  if (item === undefined) {
    return [
      "No companies matched. Try a shorter company-name fragment or verify Korean spacing.",
      "Run darty search-company --help for company lookup options.",
    ];
  }

  return [
    `Search filings: darty search-company-reports --company-code ${item.companyCode} --start-date YYYYMMDD --end-date YYYYMMDD --agent`,
    `Fetch company details: darty company-detail --company-code ${item.companyCode}`,
    `Fetch company RSS: darty company-rss --company-code ${item.companyCode}`,
  ];
};

const toSearchCompanyAgentItem = (
  item: SearchCompanyResult["result"]["items"][number],
): SearchCompanyAgentCliItem => ({
  companyCode: item.companyCode,
  companyName: item.companyName,
  marketKind: item.marketKind,
  detailEndpoint: item.references.detailEndpoint,
  ...(item.stockCode === undefined ? {} : { stockCode: item.stockCode }),
  ...(item.marketLabel === undefined ? {} : { marketLabel: item.marketLabel }),
});

const toSearchCompanyAgentCliResult = (
  result: SearchCompanyResult,
  help: readonly string[],
): SearchCompanyAgentCliResult => ({
  result: {
    ...result.result,
    items: result.result.items.map(toSearchCompanyAgentItem),
  },
  metadata: toAgentMetadata(result),
  references: result.references,
  warnings: result.warnings,
  help,
});

export const toSearchCompanyCliResult = (
  result: SearchCompanyResult,
  output: SearchCliOutputOptions,
): SearchCompanyCliResult | SearchCompanyAgentCliResult => {
  const help = toSearchCompanyHelp(result);

  return output.agent === true
    ? toSearchCompanyAgentCliResult(result, help)
    : toSearchCliResult(result, output, help);
};

export type SearchBodyCompactCliItem = SearchCompactCliItem<
  SearchBodyResult["result"]["items"][number]
>;

export type SearchBodyCompactCliResult = SearchCompactCliResult<SearchBodyResult>;

export type SearchBodyCliResult = SearchCliResult<SearchBodyResult>;

export type SearchBodyAgentCliItem = {
  readonly companyName: string;
  readonly companyCode?: string;
  readonly receiptNumber: string;
  readonly reportTitle: string;
  readonly receiptDate: string;
  readonly snippetText: string;
  readonly viewerUrl: string;
};

export type SearchBodyAgentCliResult = AgentSearchResult<
  SearchBodyResult,
  SearchBodyAgentCliItem
>;

const toSearchBodyHelp = (result: SearchBodyResult): readonly string[] => {
  const [item] = result.result.items;
  const request = result.result.request;
  const nextPage =
    result.result.pagination.currentPage < result.result.pagination.totalPages
      ? [
          `Continue search page: ${joinCliCommand([
            "darty",
            "search-body",
            ...optionParts("--keyword", request.keyword),
            ...optionParts("--start-date", request.startDate),
            ...optionParts("--end-date", request.endDate),
            ...optionParts("--company-code", request.companyCode),
            ...optionParts("--presenter-name", request.presenterName),
            ...optionParts("--report-name", request.reportName),
            ...defaultedOptionParts("--sort-by", request.sortBy, "date"),
            ...defaultedOptionParts(
              "--sort-direction",
              request.sortDirection,
              "desc",
            ),
            ...optionParts("--page", result.result.pagination.currentPage + 1),
            "--agent",
          ])}`,
        ]
      : [];

  if (item === undefined) {
    return [
      "No filings matched. Widen the date range, relax filters, or try DART search syntax such as OR with |.",
      "Run darty search-body --help for keyword syntax and filters.",
      ...nextPage,
    ];
  }

  return [
    `Inspect filing TOC: darty view-report --receipt ${item.filing.receiptNumber}`,
    `Read a returned section: darty view-report --receipt ${item.filing.receiptNumber} --section-id <toc[].id>`,
    ...nextPage,
  ];
};

const toSearchBodyAgentItem = (
  item: SearchBodyResult["result"]["items"][number],
): SearchBodyAgentCliItem => ({
  companyName: item.company.name,
  receiptNumber: item.filing.receiptNumber,
  reportTitle: item.filing.reportTitle,
  receiptDate: item.filing.receiptDate,
  snippetText: item.match.snippetText,
  viewerUrl: item.references.viewerUrl,
  ...(item.company.companyCode === undefined
    ? {}
    : { companyCode: item.company.companyCode }),
});

const toSearchBodyAgentCliResult = (
  result: SearchBodyResult,
  help: readonly string[],
): SearchBodyAgentCliResult => ({
  result: {
    ...result.result,
    items: result.result.items.map(toSearchBodyAgentItem),
  },
  metadata: toAgentMetadata(result),
  references: result.references,
  warnings: result.warnings,
  help,
});

export const toSearchBodyCliResult = (
  result: SearchBodyResult,
  output: SearchCliOutputOptions,
): SearchBodyCliResult | SearchBodyAgentCliResult => {
  const help = toSearchBodyHelp(result);

  return output.agent === true
    ? toSearchBodyAgentCliResult(result, help)
    : toSearchCliResult(result, output, help);
};

export type SearchCompanyReportsCompactCliItem = SearchCompactCliItem<
  SearchCompanyReportsResult["result"]["items"][number]
>;

export type SearchCompanyReportsCompactCliResult =
  SearchCompactCliResult<SearchCompanyReportsResult>;

export type SearchCompanyReportsCliResult =
  SearchCliResult<SearchCompanyReportsResult>;

export type SearchCompanyReportsAgentCliItem = {
  readonly companyCode: string;
  readonly companyName?: string;
  readonly receiptNumber: string;
  readonly reportTitle: string;
  readonly receiptDate: string;
  readonly presenterName?: string;
  readonly viewerUrl: string;
  readonly disclosureTypeCode?: string;
  readonly disclosureTypeLabel?: string;
};

export type SearchCompanyReportsAgentCliResult = AgentSearchResult<
  SearchCompanyReportsResult,
  SearchCompanyReportsAgentCliItem
>;

const toSearchCompanyReportsHelp = (
  result: SearchCompanyReportsResult,
): readonly string[] => {
  const [item] = result.result.items;
  const request = result.result.request;
  const nextPage =
    result.result.pagination.currentPage < result.result.pagination.totalPages
      ? [
          `Continue search page: ${joinCliCommand([
            "darty",
            "search-company-reports",
            ...optionParts("--company-code", request.companyCode),
            ...optionParts("--start-date", request.startDate),
            ...optionParts("--end-date", request.endDate),
            ...defaultedOptionParts("--page-size", request.pageSize, 15),
            ...defaultedOptionParts(
              "--sort-direction",
              request.sortDirection,
              "desc",
            ),
            ...optionParts("--presenter-name", request.presenterName),
            ...optionParts("--report-name", request.reportName),
            ...request.disclosureTypes.flatMap((value) =>
              optionParts("--disclosure-type", value),
            ),
            ...defaultedOptionParts("--industry-code", request.industryCode, "all"),
            ...defaultedOptionParts(
              "--corporation-type",
              request.corporationType,
              "all",
            ),
            ...defaultedOptionParts(
              "--closing-accounts-month",
              request.closingAccountsMonth,
              "all",
            ),
            ...booleanFlagPart("--include-all-reports", request.includeAllReports),
            ...optionParts("--page", result.result.pagination.currentPage + 1),
            "--agent",
          ])}`,
        ]
      : [];

  if (item === undefined) {
    return [
      "No filings matched. Widen the date range, relax filters, or use disclosure-types to verify filter codes.",
      "Run darty search-company-reports --help for filing search options.",
      ...nextPage,
    ];
  }

  return [
    `Inspect filing TOC: darty view-report --receipt ${item.filing.receiptNumber}`,
    `Read a returned section: darty view-report --receipt ${item.filing.receiptNumber} --section-id <toc[].id>`,
    ...nextPage,
  ];
};

const toSearchCompanyReportsAgentItem = (
  item: SearchCompanyReportsResult["result"]["items"][number],
): SearchCompanyReportsAgentCliItem => ({
  companyCode: item.company.companyCode,
  receiptNumber: item.filing.receiptNumber,
  reportTitle: item.filing.reportTitle,
  receiptDate: item.filing.receiptDate,
  viewerUrl: item.references.viewerUrl,
  ...(item.company.name === undefined ? {} : { companyName: item.company.name }),
  ...(item.filing.presenterName === undefined
    ? {}
    : { presenterName: item.filing.presenterName }),
  ...(item.matchedDisclosureType?.code === undefined
    ? {}
    : { disclosureTypeCode: item.matchedDisclosureType.code }),
  ...(item.matchedDisclosureType?.label === undefined
    ? {}
    : { disclosureTypeLabel: item.matchedDisclosureType.label }),
});

const toSearchCompanyReportsAgentCliResult = (
  result: SearchCompanyReportsResult,
  help: readonly string[],
): SearchCompanyReportsAgentCliResult => ({
  result: {
    ...result.result,
    items: result.result.items.map(toSearchCompanyReportsAgentItem),
  },
  metadata: toAgentMetadata(result),
  references: result.references,
  warnings: result.warnings,
  help,
});

export const toSearchCompanyReportsCliResult = (
  result: SearchCompanyReportsResult,
  output: SearchCliOutputOptions,
): SearchCompanyReportsCliResult | SearchCompanyReportsAgentCliResult => {
  const help = toSearchCompanyReportsHelp(result);

  return output.agent === true
    ? toSearchCompanyReportsAgentCliResult(result, help)
    : toSearchCliResult(result, output, help);
};
