import { Effect } from "effect";

import { searchContents } from "../../dart/dsab007/client.ts";
import type { ContentsSearchInput } from "../../dart/dsab007/contracts.ts";
import type { ContentsSearchResult } from "../../dart/dsab007/models.ts";
import {
  resolveContentsSearchInput,
  toContentsSearchResult,
  toContentsSearchReplayInput,
  type ContentsSearchOperationResult,
  type ContentsSearchRawInput,
  type ContentsSearchResolvedInput,
} from "./contents-search-input.ts";

type ContentsSearchRunner = {
  readonly runSearch: (
    input: ContentsSearchInput,
  ) => Promise<ContentsSearchResult>;
};

const defaultOperationRunner: ContentsSearchRunner = {
  runSearch: (input) => Effect.runPromise(searchContents(input)),
};

/**
 * Shared semantic execution flow for the `contents-search` operation.
 *
 * Transports pass semantic raw input here, and the operation layer takes care
 * of resolution, DART replay mapping, low-level execution, and semantic result
 * shaping.
 */
export const executeContentsSearch = async (
  input: Partial<ContentsSearchRawInput> & Record<string, unknown>,
  runner: ContentsSearchRunner = defaultOperationRunner,
): Promise<ContentsSearchOperationResult> => {
  const request = resolveContentsSearchInput(input);
  const result = await runner.runSearch(toContentsSearchReplayInput(request));

  return toContentsSearchResult(request, result);
};

/**
 * Executes the operation when the caller already holds a resolved semantic
 * request. This keeps the semantic result contract shared without forcing every
 * caller through the raw-input resolver path.
 */
export const executeResolvedContentsSearch = async (
  request: ContentsSearchResolvedInput,
  runner: ContentsSearchRunner = defaultOperationRunner,
): Promise<ContentsSearchOperationResult> => {
  const result = await runner.runSearch(toContentsSearchReplayInput(request));

  return toContentsSearchResult(request, result);
};
