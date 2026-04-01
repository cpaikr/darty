import {
  type ContentsSearchRawInput,
  type ContentsSearchRequest,
  type ContentsSearchResult,
} from "../capabilities/contents-search/contract.ts";
import {
  executeContentsSearch,
  executeResolvedContentsSearch,
} from "../capabilities/contents-search/execute.ts";
import { dsab007ContentsProvider } from "../sources/dart/dsab007/contents/search.ts";

export const executeDefaultContentsSearch = (
  input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
): Promise<ContentsSearchResult> =>
  executeContentsSearch(input, dsab007ContentsProvider);

export const executeDefaultResolvedContentsSearch = (
  request: ContentsSearchRequest,
): Promise<ContentsSearchResult> =>
  executeResolvedContentsSearch(request, dsab007ContentsProvider);
