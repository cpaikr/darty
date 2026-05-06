#!/usr/bin/env bun

import { Command } from "commander";

import { defaultSearchBodyOperation } from "./app/search-body.ts";
import { defaultViewReportOperation } from "./app/view-report.ts";
import {
  createSearchBodyCommandWithRunner,
  executeSearchBodyCommand,
  renderSearchBodyCliErrorMessage,
} from "./cli/commands/search-body.ts";
import {
  createViewReportCommandWithRunner,
  executeViewReportCommand,
  renderViewReportCliErrorMessage,
} from "./cli/commands/view-report.ts";

const writeStdout = (text: string) => {
  console.log(text);
};

const defaultSearchBodyExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchBodyOperation.execute(input),
  writeStdout,
};

const defaultViewReportExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultViewReportOperation.execute(input),
  writeStdout,
};

const program = new Command()
  .name("darty")
  .description("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.")
  .helpOption("-h, --help", "도움말을 표시합니다.")
  .addHelpCommand("help [command]", "명령 도움말을 표시합니다.")
  .addCommand(
    createSearchBodyCommandWithRunner((options) =>
      executeSearchBodyCommand(options, defaultSearchBodyExecutor),
    ),
  )
  .addCommand(
    createViewReportCommandWithRunner((options) =>
      executeViewReportCommand(options, defaultViewReportExecutor),
    ),
  );

if (process.argv.length <= 2) {
  program.outputHelp();
} else {
  program.parseAsync(process.argv).catch((error) => {
    const cliMessage =
      renderSearchBodyCliErrorMessage(error) ??
      renderViewReportCliErrorMessage(error);

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
