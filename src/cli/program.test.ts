import { describe, expect, test } from "bun:test";

import { createDartyCliProgram } from "./program.ts";

const publicCliCommands = [
  "company-detail",
  "company-rss",
  "disclosure-types",
  "report-guide",
  "search-body",
  "search-company",
  "search-company-reports",
  "view-report",
] as const;

const sorted = (values: readonly string[]): string[] => [...values].sort();

describe("Darty public operation registry", () => {
  test("keeps the CLI command registry explicit", () => {
    const cliCommandNames = sorted(
      createDartyCliProgram().commands.map((command) => command.name()),
    );

    expect(cliCommandNames).toEqual(sorted(publicCliCommands));
  });
});
