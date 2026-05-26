import type { DartyAgentToolName } from "../../../src/app/agent-tools.ts";
import type { SearchBodyCliScenario } from "../../search-body/shared/cli-scenarios.ts";
import { evaluateAgentNativeInvocation } from "../../search-body/agent-native/invocation-assertions.ts";
import type { ToolExecution as TypedToolExecution } from "../../search-body/agent-native/types.ts";
import { evaluateWorkflowInvocation } from "../../workflows/agent-native/invocation-assertions.ts";
import type { WorkflowScenario } from "../../scenarios/filing-workflows.ts";
import { isRecord, parseJsonObject } from "../../harness/json.ts";
import type { PiToolExecution } from "./pi-single-tool.ts";

const operationToTypedToolName = new Map<string, DartyAgentToolName>([
  ["search-body", "darty_search_body"],
  ["search-company", "darty_search_company"],
  ["search-company-reports", "darty_search_company_reports"],
  ["company-detail", "darty_get_company_detail"],
  ["company-rss", "darty_get_company_rss"],
  ["disclosure-types", "darty_list_disclosure_types"],
  ["report-guide", "darty_get_report_guide"],
  ["view-report", "darty_view_report"],
]);

const inputCommand = (execution: PiToolExecution): string | undefined =>
  isRecord(execution.input) && typeof execution.input.command === "string"
    ? execution.input.command
    : undefined;

const inputAction = (execution: PiToolExecution): string | undefined =>
  isRecord(execution.input) && typeof execution.input.action === "string"
    ? execution.input.action
    : undefined;

const runDetails = (execution: PiToolExecution): Record<string, unknown> | undefined => {
  if (execution.stdout.length === 0) {
    return undefined;
  }

  try {
    const parsed = parseJsonObject(execution.stdout);
    return parsed.action === "run" ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const toTypedToolExecutions = (
  toolExecutions: readonly PiToolExecution[],
): readonly TypedToolExecution[] =>
  toolExecutions.flatMap((execution) => {
    const details = runDetails(execution);
    const command =
      typeof details?.command === "string" ? details.command : inputCommand(execution);
    const toolName = command === undefined ? undefined : operationToTypedToolName.get(command);

    if (toolName === undefined) {
      return [];
    }

    const normalizedInput = isRecord(details?.normalizedInput)
      ? details.normalizedInput
      : isRecord(execution.input) && isRecord(execution.input.inputJson)
        ? execution.input.inputJson
        : {};

    return [
      {
        toolName,
        input: normalizedInput,
        display: execution.display,
        exitCode: execution.exitCode,
        stdout: JSON.stringify(details?.result ?? {}),
        stderr: execution.stderr,
        ...(execution.rejected === undefined ? {} : { rejected: execution.rejected }),
      },
    ];
  });

const assertUsedPiSingleTool = (toolExecutions: readonly PiToolExecution[]): readonly string[] =>
  toolExecutions.some((execution) => execution.toolName === "darty")
    ? []
    : ["agent never called the public darty Pi single tool"];

const assertDiscoveryWhenNeeded = (
  toolExecutions: readonly PiToolExecution[],
  reasons: string[],
): void => {
  const usedDiscovery = toolExecutions.some((execution) => {
    const action = inputAction(execution);
    return action === "help" || action === "command_help";
  });

  if (!usedDiscovery) {
    reasons.push("agent did not use help or command_help to discover the Pi single-tool surface");
  }
};

export const evaluatePiSearchBodyInvocation = (
  scenario: SearchBodyCliScenario,
  toolExecutions: readonly PiToolExecution[],
): readonly string[] => {
  const reasons = [...assertUsedPiSingleTool(toolExecutions)];
  const typedExecutions = toTypedToolExecutions(toolExecutions);
  reasons.push(...evaluateAgentNativeInvocation(scenario, typedExecutions));
  return reasons;
};

export const evaluatePiWorkflowInvocation = (
  scenario: WorkflowScenario,
  toolExecutions: readonly PiToolExecution[],
  options?: { readonly finalAnswer?: string; readonly requireDiscovery?: boolean },
): readonly string[] => {
  const reasons = [...assertUsedPiSingleTool(toolExecutions)];
  if (options?.requireDiscovery === true) {
    assertDiscoveryWhenNeeded(toolExecutions, reasons);
  }

  const typedExecutions = toTypedToolExecutions(toolExecutions);
  reasons.push(
    ...evaluateWorkflowInvocation(
      scenario,
      typedExecutions,
      options?.finalAnswer === undefined ? undefined : { finalAnswer: options.finalAnswer },
    ),
  );
  return reasons;
};

export const evaluatePiRecoveryInvocation = (input: {
  readonly toolExecutions: readonly PiToolExecution[];
  readonly finalAnswer: string;
}): readonly string[] => {
  const reasons = [...assertUsedPiSingleTool(input.toolExecutions)];
  const validationFailure = input.toolExecutions.find((execution) => {
    if (execution.stdout.length === 0 && execution.stderr.length === 0) {
      return false;
    }
    const raw = execution.stdout.length > 0 ? execution.stdout : execution.stderr;
    try {
      const details = parseJsonObject(raw);
      return details.ok === false && details.action === "validate";
    } catch {
      return false;
    }
  });

  if (validationFailure === undefined) {
    reasons.push("agent did not surface a validation failure with action=validate");
  }

  const successfulSearch = toTypedToolExecutions(input.toolExecutions).some(
    (execution) => execution.toolName === "darty_search_body" && execution.exitCode === 0,
  );
  if (!successfulSearch) {
    reasons.push("agent did not recover by running a valid search-body command");
  }

  if (input.finalAnswer.trim().length === 0) {
    reasons.push("agent did not produce a final answer after recovery");
  }

  return reasons;
};
