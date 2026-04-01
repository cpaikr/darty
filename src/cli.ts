import { Command } from "commander";

import {
  createContentsSearchCommandWithRunner,
  executeContentsSearchCommand,
} from "./cli/commands/contents-search.ts";
import { executeContentsSearch } from "./capabilities/contents-search/execute.ts";
import { dsab007ContentsProvider } from "./sources/dart/dsab007/contents/search.ts";

const defaultContentsSearchExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    executeContentsSearch(input, dsab007ContentsProvider),
  writeStdout: (text: string) => {
    console.log(text);
  },
};

const program = new Command()
  .name("darty")
  .description("Tool-oriented access to DART search and retrieval surfaces.")
  .addCommand(
    createContentsSearchCommandWithRunner((options) =>
      executeContentsSearchCommand(options, defaultContentsSearchExecutor),
    ),
  );

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
