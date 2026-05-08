import type { SearchBodyResult } from "../../capabilities/search-body/contract.ts";
import type { SearchCompanyReportsResult } from "../../capabilities/search-company-reports/contract.ts";
import type { SearchCompanyResult } from "../../capabilities/search-company/contract.ts";
import type { CliVerboseOutputOptions } from "../command-helpers.ts";

type SearchEvidenceItem = {
  readonly evidence: unknown;
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

export type SearchCliResult<Result extends SearchResultWithEvidenceItems> =
  | Result
  | SearchCompactCliResult<Result>;

const omitEvidence = <Item extends SearchEvidenceItem>({
  evidence: _evidence,
  ...item
}: Item): SearchCompactCliItem<Item> => item;

const toSearchCliResult = <Result extends SearchResultWithEvidenceItems>(
  result: Result,
  output: CliVerboseOutputOptions,
): SearchCliResult<Result> => {
  if (output.verbose) {
    return result;
  }

  return {
    ...result,
    result: {
      ...result.result,
      items: result.result.items.map(omitEvidence),
    },
  };
};

export type SearchCompanyCompactCliItem = SearchCompactCliItem<
  SearchCompanyResult["result"]["items"][number]
>;

export type SearchCompanyCompactCliResult =
  SearchCompactCliResult<SearchCompanyResult>;

export type SearchCompanyCliResult = SearchCliResult<SearchCompanyResult>;

export const toSearchCompanyCliResult = (
  result: SearchCompanyResult,
  output: CliVerboseOutputOptions,
): SearchCompanyCliResult => toSearchCliResult(result, output);

export type SearchBodyCompactCliItem = SearchCompactCliItem<
  SearchBodyResult["result"]["items"][number]
>;

export type SearchBodyCompactCliResult = SearchCompactCliResult<SearchBodyResult>;

export type SearchBodyCliResult = SearchCliResult<SearchBodyResult>;

export const toSearchBodyCliResult = (
  result: SearchBodyResult,
  output: CliVerboseOutputOptions,
): SearchBodyCliResult => toSearchCliResult(result, output);

export type SearchCompanyReportsCompactCliItem = SearchCompactCliItem<
  SearchCompanyReportsResult["result"]["items"][number]
>;

export type SearchCompanyReportsCompactCliResult =
  SearchCompactCliResult<SearchCompanyReportsResult>;

export type SearchCompanyReportsCliResult =
  SearchCliResult<SearchCompanyReportsResult>;

export const toSearchCompanyReportsCliResult = (
  result: SearchCompanyReportsResult,
  output: CliVerboseOutputOptions,
): SearchCompanyReportsCliResult => toSearchCliResult(result, output);
