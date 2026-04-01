import { Command } from "commander";

import { createContentsSearchCommand } from "./cli/commands/contents-search.ts";

const program = new Command()
  .name("darty")
  .description("Tool-oriented access to DART search and retrieval surfaces.")
  .addCommand(createContentsSearchCommand());

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
