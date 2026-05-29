import type {
  SearchCompanyReportsRawInput,
  SearchCompanyReportsResult,
} from "../capabilities/search-company-reports/contract.ts";
import type { DartyExecutionContext } from "../capabilities/types.ts";
import { executeSearchCompanyReports } from "../capabilities/search-company-reports/execute.ts";
import type { SearchCompanyReportsProvider } from "../capabilities/search-company-reports/provider.ts";
import {
  searchCompanyReportsInputJsonSchema,
  searchCompanyReportsOperationName,
  searchCompanyReportsResultJsonSchema,
} from "../capabilities/search-company-reports/spec.ts";
import { dsab007CompanyReportsProvider } from "../sources/dart/dsab007/company-reports/search.ts";

export type SearchCompanyReportsOperation = {
  readonly name: typeof searchCompanyReportsOperationName;
  readonly inputJsonSchema: typeof searchCompanyReportsInputJsonSchema;
  readonly resultJsonSchema: typeof searchCompanyReportsResultJsonSchema;
  readonly execute: (
    input: Partial<SearchCompanyReportsRawInput> & Record<string, unknown>,
    context?: DartyExecutionContext,
  ) => Promise<SearchCompanyReportsResult>;
};

export const createSearchCompanyReportsOperation = (
  provider: SearchCompanyReportsProvider,
): SearchCompanyReportsOperation => ({
  name: searchCompanyReportsOperationName,
  inputJsonSchema: searchCompanyReportsInputJsonSchema,
  resultJsonSchema: searchCompanyReportsResultJsonSchema,
  execute: (input, context) => executeSearchCompanyReports(input, provider, context),
});

export const defaultSearchCompanyReportsOperation =
  createSearchCompanyReportsOperation(dsab007CompanyReportsProvider);
