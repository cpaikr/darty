import { Command } from "commander";

import { defaultContentsSearchOperation } from "./app/contents-search.ts";
import {
  createContentsSearchCommandWithRunner,
  executeContentsSearchCommand,
} from "./cli/commands/contents-search.ts";

const defaultContentsSearchExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultContentsSearchOperation.execute(input),
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
