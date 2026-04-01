import { Command } from "commander";

import { createDsab007ContentsCommand } from "./cli/commands/search-dsab007.ts";

const program = new Command()
  .name("darty")
  .description("Tool-oriented access to DART search and retrieval surfaces.")
  .addCommand(createDsab007ContentsCommand());

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
