import type {
  ContentsSearchRawInput,
  ContentsSearchResult,
} from "../capabilities/contents-search/contract.ts";
import { executeContentsSearch } from "../capabilities/contents-search/execute.ts";
import type { ContentsSearchProvider } from "../capabilities/contents-search/provider.ts";
import {
  contentsSearchInputJsonSchema,
  contentsSearchOperationName,
  contentsSearchResultJsonSchema,
} from "../capabilities/contents-search/spec.ts";
import { dsab007ContentsProvider } from "../sources/dart/dsab007/contents/search.ts";

/**
 * Shared composition seam for the public contents-search capability.
 *
 * Transports can reuse the semantic schemas and execution wiring without
 * importing the DART adapter directly.
 */
export type ContentsSearchOperation = {
  readonly name: typeof contentsSearchOperationName;
  readonly inputJsonSchema: typeof contentsSearchInputJsonSchema;
  readonly resultJsonSchema: typeof contentsSearchResultJsonSchema;
  readonly execute: (
    input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  ) => Promise<ContentsSearchResult>;
};

export const createContentsSearchOperation = (
  provider: ContentsSearchProvider,
): ContentsSearchOperation => ({
  name: contentsSearchOperationName,
  inputJsonSchema: contentsSearchInputJsonSchema,
  resultJsonSchema: contentsSearchResultJsonSchema,
  execute: (input) => executeContentsSearch(input, provider),
});

export const defaultContentsSearchOperation = createContentsSearchOperation(
  dsab007ContentsProvider,
);
