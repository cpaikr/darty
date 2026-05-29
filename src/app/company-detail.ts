import type {
  CompanyDetailRawInput,
  CompanyDetailResult,
} from "../capabilities/company-detail/contract.ts";
import type { DartyExecutionContext } from "../capabilities/types.ts";
import { executeCompanyDetail } from "../capabilities/company-detail/execute.ts";
import type { CompanyDetailProvider } from "../capabilities/company-detail/provider.ts";
import {
  companyDetailInputJsonSchema,
  companyDetailOperationName,
  companyDetailResultJsonSchema,
} from "../capabilities/company-detail/spec.ts";
import { dsae001CompanyDetailProvider } from "../sources/dart/dsae001/detail/detail.ts";

export type CompanyDetailOperation = {
  readonly name: typeof companyDetailOperationName;
  readonly inputJsonSchema: typeof companyDetailInputJsonSchema;
  readonly resultJsonSchema: typeof companyDetailResultJsonSchema;
  readonly execute: (
    input: Partial<CompanyDetailRawInput> & Record<string, unknown>,
    context?: DartyExecutionContext,
  ) => Promise<CompanyDetailResult>;
};

export const createCompanyDetailOperation = (
  provider: CompanyDetailProvider,
): CompanyDetailOperation => ({
  name: companyDetailOperationName,
  inputJsonSchema: companyDetailInputJsonSchema,
  resultJsonSchema: companyDetailResultJsonSchema,
  execute: (input, context) => executeCompanyDetail(input, provider, context),
});

export const defaultCompanyDetailOperation = createCompanyDetailOperation(
  dsae001CompanyDetailProvider,
);
