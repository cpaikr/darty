import type {
  SearchBodyRawInput,
  SearchBodyResult,
} from "../capabilities/search-body/contract.ts";
import { executeSearchBody } from "../capabilities/search-body/execute.ts";
import type { SearchBodyProvider } from "../capabilities/search-body/provider.ts";
import {
  searchBodyInputJsonSchema,
  searchBodyOperationName,
  searchBodyResultJsonSchema,
} from "../capabilities/search-body/spec.ts";
import { dsab007ContentsProvider } from "../sources/dart/dsab007/contents/search.ts";

/**
 * Shared composition seam for the public search-body capability.
 *
 * Transports can reuse the semantic schemas and execution wiring without
 * importing the DART adapter directly.
 */
export type SearchBodyOperation = {
  readonly name: typeof searchBodyOperationName;
  readonly inputJsonSchema: typeof searchBodyInputJsonSchema;
  readonly resultJsonSchema: typeof searchBodyResultJsonSchema;
  readonly execute: (
    input: Partial<SearchBodyRawInput> & Record<string, unknown>,
  ) => Promise<SearchBodyResult>;
};

export const createSearchBodyOperation = (
  provider: SearchBodyProvider,
): SearchBodyOperation => ({
  name: searchBodyOperationName,
  inputJsonSchema: searchBodyInputJsonSchema,
  resultJsonSchema: searchBodyResultJsonSchema,
  execute: (input) => executeSearchBody(input, provider),
});

export const defaultSearchBodyOperation = createSearchBodyOperation(
  dsab007ContentsProvider,
);
