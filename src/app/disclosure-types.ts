import type {
  DisclosureTypesRawInput,
  DisclosureTypesResult,
} from "../capabilities/disclosure-types/contract.ts";
import { executeDisclosureTypes } from "../capabilities/disclosure-types/execute.ts";
import {
  disclosureTypesInputJsonSchema,
  disclosureTypesOperationName,
  disclosureTypesResultJsonSchema,
} from "../capabilities/disclosure-types/spec.ts";

export type DisclosureTypesOperation = {
  readonly name: typeof disclosureTypesOperationName;
  readonly inputJsonSchema: typeof disclosureTypesInputJsonSchema;
  readonly resultJsonSchema: typeof disclosureTypesResultJsonSchema;
  readonly execute: (
    input: Partial<DisclosureTypesRawInput> & Record<string, unknown>,
  ) => Promise<DisclosureTypesResult>;
};

export const defaultDisclosureTypesOperation: DisclosureTypesOperation = {
  name: disclosureTypesOperationName,
  inputJsonSchema: disclosureTypesInputJsonSchema,
  resultJsonSchema: disclosureTypesResultJsonSchema,
  execute: executeDisclosureTypes,
};
