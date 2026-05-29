import type {
  CompanyRssRawInput,
  CompanyRssResult,
} from "../capabilities/company-rss/contract.ts";
import type { DartyExecutionContext } from "../capabilities/types.ts";
import { executeCompanyRss } from "../capabilities/company-rss/execute.ts";
import type { CompanyRssProvider } from "../capabilities/company-rss/provider.ts";
import {
  companyRssInputJsonSchema,
  companyRssOperationName,
  companyRssResultJsonSchema,
} from "../capabilities/company-rss/spec.ts";
import { dartCompanyRssProvider } from "../sources/dart/api/company-rss/rss.ts";

export type CompanyRssOperation = {
  readonly name: typeof companyRssOperationName;
  readonly inputJsonSchema: typeof companyRssInputJsonSchema;
  readonly resultJsonSchema: typeof companyRssResultJsonSchema;
  readonly execute: (
    input: Partial<CompanyRssRawInput> & Record<string, unknown>,
    context?: DartyExecutionContext,
  ) => Promise<CompanyRssResult>;
};

export const createCompanyRssOperation = (
  provider: CompanyRssProvider,
): CompanyRssOperation => ({
  name: companyRssOperationName,
  inputJsonSchema: companyRssInputJsonSchema,
  resultJsonSchema: companyRssResultJsonSchema,
  execute: (input, context) => executeCompanyRss(input, provider, context),
});

export const defaultCompanyRssOperation = createCompanyRssOperation(
  dartCompanyRssProvider,
);
