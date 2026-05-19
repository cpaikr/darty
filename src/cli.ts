import { Command } from "commander";

import { defaultCompanyDetailOperation } from "./app/company-detail.ts";
import { defaultCompanyRssOperation } from "./app/company-rss.ts";
import { defaultDisclosureTypesOperation } from "./app/disclosure-types.ts";
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
  createDisclosureTypesCommandWithRunner,
  executeDisclosureTypesCommand,
  renderDisclosureTypesCliErrorMessage,
} from "./cli/commands/disclosure-types.ts";
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
import {
  configureCliTransport,
  renderCliFailureJson,
} from "./cli/command-helpers.ts";

const writeStdout = (text: string) => {
  console.log(text);
};

const shouldPrettyPrintJson = (argv: readonly string[]): boolean =>
  argv.includes("--pretty");

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

const defaultDisclosureTypesExecutor = {
  runOperation: (input: Record<string, unknown>) =>
    defaultDisclosureTypesOperation.execute(input),
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

const rootHelpNotes = `
주의사항:
  - 이 도구는 Yahoo Finance처럼 브라우저 상호작용 중 발생하는 API 호출을 모방해 동작합니다.
  - DART의 공식 OpenDART API를 사용하지 않습니다.
  - 정확성을 보장하지 않습니다. 정보 사용 책임은 사용자에게 있으며, 이 도구는 어떤 보증도 제공하지 않습니다.
`;

const program = configureCliTransport(new Command())
  .name("darty")
  .description("DART 검색 및 조회 기능을 도구 친화적으로 제공합니다.")
  .helpOption("-h, --help", "도움말을 표시합니다.")
  .addHelpCommand("help [command]", "명령 도움말을 표시합니다.")
  .addHelpText("after", rootHelpNotes)
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
    createDisclosureTypesCommandWithRunner((options) =>
      executeDisclosureTypesCommand(options, defaultDisclosureTypesExecutor),
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
      renderDisclosureTypesCliErrorMessage(error) ??
      renderSearchBodyCliErrorMessage(error) ??
      renderSearchCompanyCliErrorMessage(error) ??
      renderSearchCompanyReportsCliErrorMessage(error) ??
      renderViewReportCliErrorMessage(error);

    writeStdout(
      renderCliFailureJson(error, {
        ...(cliMessage === undefined ? {} : { message: cliMessage }),
        pretty: shouldPrettyPrintJson(process.argv),
      }),
    );
    process.exitCode = 1;
  });
}
