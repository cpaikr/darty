import type {
  SearchCompanyRawInput,
  SearchCompanyResult,
} from "../capabilities/search-company/contract.ts";
import { executeSearchCompany } from "../capabilities/search-company/execute.ts";
import type { SearchCompanyProvider } from "../capabilities/search-company/provider.ts";
import {
  searchCompanyInputJsonSchema,
  searchCompanyOperationName,
  searchCompanyResultJsonSchema,
} from "../capabilities/search-company/spec.ts";
import { dsae001CompanyProvider } from "../sources/dart/dsae001/company/search.ts";

export type SearchCompanyOperation = {
  readonly name: typeof searchCompanyOperationName;
  readonly inputJsonSchema: typeof searchCompanyInputJsonSchema;
  readonly resultJsonSchema: typeof searchCompanyResultJsonSchema;
  readonly execute: (
    input: Partial<SearchCompanyRawInput> & Record<string, unknown>,
  ) => Promise<SearchCompanyResult>;
};

export const createSearchCompanyOperation = (
  provider: SearchCompanyProvider,
): SearchCompanyOperation => ({
  name: searchCompanyOperationName,
  inputJsonSchema: searchCompanyInputJsonSchema,
  resultJsonSchema: searchCompanyResultJsonSchema,
  execute: (input) => executeSearchCompany(input, provider),
});

export const defaultSearchCompanyOperation = createSearchCompanyOperation(
  dsae001CompanyProvider,
);
