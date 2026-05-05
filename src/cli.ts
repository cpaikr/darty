#!/usr/bin/env bun

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
  .description("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.")
  .addCommand(
    createContentsSearchCommandWithRunner((options) =>
      executeContentsSearchCommand(options, defaultContentsSearchExecutor),
    ),
  );

if (process.argv.length <= 2) {
  program.outputHelp();
} else {
  program.parseAsync(process.argv).catch((error) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  });
}
