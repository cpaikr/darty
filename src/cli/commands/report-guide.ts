import { Command } from "commander";

import {
  reportGuideCliCopy,
  reportGuideToolCopy,
} from "../../capabilities/report-guide/copy.ts";
import type {
  ReportGuideRawInput,
  ReportGuideResult,
} from "../../capabilities/report-guide/contract.ts";
import { reportGuideOperationName } from "../../capabilities/report-guide/spec.ts";
import { configureCliTransport, type ParsedCliCommand } from "../command-helpers.ts";

export type ReportGuideCliCommand = ParsedCliCommand<ReportGuideRawInput>;

export type ReportGuideCommandExecutor = {
  readonly runOperation: (
    input: Partial<ReportGuideRawInput> & Record<string, unknown>,
  ) => Promise<ReportGuideResult>;
  readonly writeStdout: (text: string) => void;
};

const renderSupplementalHelp = (): string => {
  const examples = reportGuideCliCopy.examples
    .map((example) => {
      const suffix =
        example.argv.length === 0 ? "" : ` ${example.argv.join(" ")}`;

      return `  # ${example.description}\n  darty ${reportGuideOperationName}${suffix}`;
    })
    .join("\n\n");

  const notes = reportGuideCliCopy.notes.map((note) => `  - ${note}`).join("\n");
  const notesSection =
    notes.length > 0 ? `\n\n${reportGuideCliCopy.notesHeading}:\n${notes}` : "";

  return `\n${reportGuideCliCopy.examplesHeading}:\n${examples}${notesSection}\n`;
};

const toReportGuideCliCommand = (): ReportGuideCliCommand => ({
  request: {},
  output: { pretty: false },
});

const buildReportGuideCommand = (
  onRun?: (command: ReportGuideCliCommand) => Promise<void>,
): Command => {
  const command = configureCliTransport(new Command(reportGuideOperationName))
    .summary(reportGuideCliCopy.summary)
    .description(reportGuideToolCopy.description)
    .helpOption("-h, --help", "명령 도움말을 표시합니다.")
    .addHelpText("after", renderSupplementalHelp());

  if (onRun !== undefined) {
    command.action(() => onRun(toReportGuideCliCommand()));
  }

  return command;
};

const renderReportGuideResult = (result: ReportGuideResult): string =>
  result.result.contentMarkdown;

export const executeReportGuideCommand = (
  command: ReportGuideCliCommand,
  executor: ReportGuideCommandExecutor,
): Promise<void> =>
  executor
    .runOperation(command.request)
    .then((result) => executor.writeStdout(renderReportGuideResult(result)));

export const reportGuideUsage = `${buildReportGuideCommand().helpInformation()}${renderSupplementalHelp()}`;

export const parseReportGuideCommandArgs = (argv: string[]): ReportGuideCliCommand => {
  const command = buildReportGuideCommand().exitOverride();

  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.parse(argv, { from: "user" });

  return toReportGuideCliCommand();
};

export const createReportGuideCommandWithRunner = (
  onRun: (command: ReportGuideCliCommand) => Promise<void>,
): Command => buildReportGuideCommand(onRun);
