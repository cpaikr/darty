#!/usr/bin/env bun

import { Command } from "commander";

import { defaultContentsSearchOperation } from "./app/contents-search.ts";
import { defaultReportViewOperation } from "./app/report-view.ts";
import {
  createContentsSearchCommandWithRunner,
  executeContentsSearchCommand,
  renderContentsSearchCliErrorMessage,
} from "./cli/commands/contents-search.ts";
import {
  createReportViewCommandWithRunner,
  executeReportViewCommand,
  renderReportViewCliErrorMessage,
} from "./cli/commands/report-view.ts";

const writeStdout = (text: string) => {
  console.log(text);
};

const defaultContentsSearchExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultContentsSearchOperation.execute(input),
  writeStdout,
};

const defaultReportViewExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultReportViewOperation.execute(input),
  writeStdout,
};

const program = new Command()
  .name("darty")
  .description("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.")
  .helpOption("-h, --help", "도움말을 표시합니다.")
  .addHelpCommand("help [command]", "명령 도움말을 표시합니다.")
  .addCommand(
    createContentsSearchCommandWithRunner((options) =>
      executeContentsSearchCommand(options, defaultContentsSearchExecutor),
    ),
  )
  .addCommand(
    createReportViewCommandWithRunner((options) =>
      executeReportViewCommand(options, defaultReportViewExecutor),
    ),
  );

if (process.argv.length <= 2) {
  program.outputHelp();
} else {
  program.parseAsync(process.argv).catch((error) => {
    const cliMessage =
      renderContentsSearchCliErrorMessage(error) ??
      renderReportViewCliErrorMessage(error);

    if (cliMessage !== undefined) {
      console.error(cliMessage);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  });
}
