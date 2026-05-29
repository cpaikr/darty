import type {
  SearchCompanyRawInput,
  SearchCompanyResult,
} from "../capabilities/search-company/contract.ts";
import type { DartyExecutionContext } from "../capabilities/types.ts";
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
    context?: DartyExecutionContext,
  ) => Promise<SearchCompanyResult>;
};

export const createSearchCompanyOperation = (
  provider: SearchCompanyProvider,
): SearchCompanyOperation => ({
  name: searchCompanyOperationName,
  inputJsonSchema: searchCompanyInputJsonSchema,
  resultJsonSchema: searchCompanyResultJsonSchema,
  execute: (input, context) => executeSearchCompany(input, provider, context),
});

export const defaultSearchCompanyOperation = createSearchCompanyOperation(
  dsae001CompanyProvider,
);
