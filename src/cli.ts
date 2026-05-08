#!/usr/bin/env bun

import { Command } from "commander";

import { defaultCompanyDetailOperation } from "./app/company-detail.ts";
import { defaultCompanyRssOperation } from "./app/company-rss.ts";
import { defaultSearchBodyOperation } from "./app/search-body.ts";
import { defaultSearchCompanyOperation } from "./app/search-company.ts";
import { defaultSearchCompanyReportsOperation } from "./app/search-company-reports.ts";
import { defaultViewReportOperation } from "./app/view-report.ts";
import {
  createCompanyDetailCommandWithRunner,
  executeCompanyDetailCommand,
  renderCompanyDetailCliErrorMessage,
} from "./cli/commands/company-detail.ts";
import {
  createCompanyRssCommandWithRunner,
  executeCompanyRssCommand,
  renderCompanyRssCliErrorMessage,
} from "./cli/commands/company-rss.ts";
import {
  createSearchBodyCommandWithRunner,
  executeSearchBodyCommand,
  renderSearchBodyCliErrorMessage,
} from "./cli/commands/search-body.ts";
import {
  createSearchCompanyCommandWithRunner,
  executeSearchCompanyCommand,
  renderSearchCompanyCliErrorMessage,
} from "./cli/commands/search-company.ts";
import {
  createSearchCompanyReportsCommandWithRunner,
  executeSearchCompanyReportsCommand,
  renderSearchCompanyReportsCliErrorMessage,
} from "./cli/commands/search-company-reports.ts";
import {
  createViewReportCommandWithRunner,
  executeViewReportCommand,
  renderViewReportCliErrorMessage,
} from "./cli/commands/view-report.ts";

const writeStdout = (text: string) => {
  console.log(text);
};

const defaultCompanyDetailExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultCompanyDetailOperation.execute(input),
  writeStdout,
};

const defaultCompanyRssExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultCompanyRssOperation.execute(input),
  writeStdout,
};

const defaultSearchBodyExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchBodyOperation.execute(input),
  writeStdout,
};

const defaultSearchCompanyExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchCompanyOperation.execute(input),
  writeStdout,
};

const defaultSearchCompanyReportsExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultSearchCompanyReportsOperation.execute(input),
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
    createCompanyDetailCommandWithRunner((options) =>
      executeCompanyDetailCommand(options, defaultCompanyDetailExecutor),
    ),
  )
  .addCommand(
    createCompanyRssCommandWithRunner((options) =>
      executeCompanyRssCommand(options, defaultCompanyRssExecutor),
    ),
  )
  .addCommand(
    createSearchBodyCommandWithRunner((options) =>
      executeSearchBodyCommand(options, defaultSearchBodyExecutor),
    ),
  )
  .addCommand(
    createSearchCompanyCommandWithRunner((options) =>
      executeSearchCompanyCommand(options, defaultSearchCompanyExecutor),
    ),
  )
  .addCommand(
    createSearchCompanyReportsCommandWithRunner((options) =>
      executeSearchCompanyReportsCommand(
        options,
        defaultSearchCompanyReportsExecutor,
      ),
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
      renderCompanyDetailCliErrorMessage(error) ??
      renderCompanyRssCliErrorMessage(error) ??
      renderSearchBodyCliErrorMessage(error) ??
      renderSearchCompanyCliErrorMessage(error) ??
      renderSearchCompanyReportsCliErrorMessage(error) ??
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
