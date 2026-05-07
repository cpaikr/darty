import type {
  CompanyRssRawInput,
  CompanyRssResult,
} from "../capabilities/company-rss/contract.ts";
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
  ) => Promise<CompanyRssResult>;
};

export const createCompanyRssOperation = (
  provider: CompanyRssProvider,
): CompanyRssOperation => ({
  name: companyRssOperationName,
  inputJsonSchema: companyRssInputJsonSchema,
  resultJsonSchema: companyRssResultJsonSchema,
  execute: (input) => executeCompanyRss(input, provider),
});

export const defaultCompanyRssOperation = createCompanyRssOperation(
  dartCompanyRssProvider,
);
