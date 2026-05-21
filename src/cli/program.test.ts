import { describe, expect, test } from "bun:test";

import { createDartyPiTools } from "../pi.ts";
import { createDartyToolset, dartyOperationNames } from "../toolset.ts";
import { createDartyCliProgram } from "./program.ts";

const sorted = (values: readonly string[]): string[] => [...values].sort();

const getPiOperationNames = async (): Promise<readonly string[]> => {
  const listTool = createDartyPiTools().find(
    (tool) => tool.name === "darty_list_operations",
  );

  const result = await listTool?.execute("operation-registry-test", {});
  const details = result?.details as
    | { readonly operations?: readonly { readonly name?: unknown }[] }
    | undefined;

  return (
    details?.operations
      ?.map((operation) => operation.name)
      .filter((name): name is string => typeof name === "string") ?? []
  );
};

describe("Darty public operation registry", () => {
  test("keeps CLI commands, neutral toolset operations, and Pi adapter operations in sync", async () => {
    const expectedNames = sorted(dartyOperationNames);
    const cliCommandNames = sorted(
      createDartyCliProgram().commands.map((command) => command.name()),
    );
    const toolsetOperationNames = sorted(
      createDartyToolset().listOperations().map((operation) => operation.name),
    );
    const piOperationNames = sorted(await getPiOperationNames());

    expect(cliCommandNames).toEqual(expectedNames);
    expect(toolsetOperationNames).toEqual(expectedNames);
    expect(piOperationNames).toEqual(expectedNames);
  });
});
