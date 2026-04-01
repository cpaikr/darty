import { Effect } from "effect";

import { searchDsab007Contents } from "../../dart/dsab007/client.ts";
import type { Dsab007ContentsSearchInput } from "../../dart/dsab007/contracts.ts";
import type { Dsab007ContentsSearchResult } from "../../dart/dsab007/models.ts";
import {
  resolveDsab007ContentsInput,
  toDsab007ContentsOperationResult,
  toDsab007ContentsSearchInput,
  type Dsab007ContentsOperationResult,
  type Dsab007ContentsRawInput,
  type Dsab007ContentsResolvedInput,
} from "./dsab007-contents-input.ts";

type Dsab007ContentsOperationRunner = {
  readonly runSearch: (
    input: Dsab007ContentsSearchInput,
  ) => Promise<Dsab007ContentsSearchResult>;
};

const defaultOperationRunner: Dsab007ContentsOperationRunner = {
  runSearch: (input) => Effect.runPromise(searchDsab007Contents(input)),
};

/**
 * Shared semantic execution flow for the `dsab007-contents` operation.
 *
 * Transports pass semantic raw input here, and the operation layer takes care
 * of resolution, DART replay mapping, low-level execution, and semantic result
 * shaping.
 */
export const executeDsab007ContentsOperation = async (
  input: Partial<Dsab007ContentsRawInput> & Record<string, unknown>,
  runner: Dsab007ContentsOperationRunner = defaultOperationRunner,
): Promise<Dsab007ContentsOperationResult> => {
  const request = resolveDsab007ContentsInput(input);
  const result = await runner.runSearch(toDsab007ContentsSearchInput(request));

  return toDsab007ContentsOperationResult(request, result);
};

/**
 * Executes the operation when the caller already holds a resolved semantic
 * request. This keeps the semantic result contract shared without forcing every
 * caller through the raw-input resolver path.
 */
export const executeResolvedDsab007ContentsOperation = async (
  request: Dsab007ContentsResolvedInput,
  runner: Dsab007ContentsOperationRunner = defaultOperationRunner,
): Promise<Dsab007ContentsOperationResult> => {
  const result = await runner.runSearch(toDsab007ContentsSearchInput(request));

  return toDsab007ContentsOperationResult(request, result);
};
