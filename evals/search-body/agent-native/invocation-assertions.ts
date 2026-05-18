import {
  assertSearchBodyEnvelope,
  parseJsonObject,
} from "../shared/cli-envelope-assertions.ts";
import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";
import type { ToolExecution } from "./types.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getStringProperty = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const child = value[key];
  return typeof child === "string" ? child : undefined;
};

const requireInputValue = (
  reasons: string[],
  input: Record<string, unknown>,
  key: string,
  expectedValue: string,
): void => {
  const actualValue = getStringProperty(input, key);

  if (actualValue !== expectedValue) {
    reasons.push(
      `expected ${key}=${expectedValue}, received ${actualValue ?? "<missing>"}`,
    );
  }
};

const assertSearchBodyCallMatchesScenario = (
  execution: ToolExecution,
  scenario: SearchBodyCliScenario,
): readonly string[] => {
  const reasons: string[] = [];

  if (execution.toolName !== "darty_search_body") {
    return [`expected darty_search_body, received ${execution.toolName}`];
  }
  if (!isRecord(execution.input)) {
    return ["tool input was not an object"];
  }

  requireInputValue(reasons, execution.input, "keyword", scenario.keyword);
  requireInputValue(reasons, execution.input, "startDate", scenario.startDate);
  requireInputValue(reasons, execution.input, "endDate", scenario.endDate);

  if (scenario.companyCode === undefined) {
    if (getStringProperty(execution.input, "companyCode") !== undefined) {
      reasons.push("received an unexpected companyCode filter");
    }
  } else {
    requireInputValue(reasons, execution.input, "companyCode", scenario.companyCode);
  }

  for (const narrowingOption of ["presenterName", "reportName"] as const) {
    if (getStringProperty(execution.input, narrowingOption) !== undefined) {
      reasons.push(`received an unexpected ${narrowingOption} filter`);
    }
  }

  if (execution.exitCode !== 0) {
    reasons.push(`darty_search_body exited with ${execution.exitCode}`);
  }

  if (execution.stdout.length > 0) {
    try {
      const envelope = parseJsonObject(execution.stdout);
      const assertion = assertSearchBodyEnvelope(envelope, scenario);
      reasons.push(...assertion.reasons);
    } catch (error) {
      reasons.push(
        `darty_search_body did not return a parseable shared envelope: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return reasons;
};

export const evaluateAgentNativeInvocation = (
  scenario: SearchBodyCliScenario,
  toolExecutions: readonly ToolExecution[],
): readonly string[] => {
  if (toolExecutions.length === 0) {
    return ["agent never called an agent-native darty tool"];
  }

  const searchExecutions = toolExecutions.filter(
    (execution) => execution.toolName === "darty_search_body",
  );

  if (searchExecutions.length === 0) {
    return ["agent never called darty_search_body"];
  }

  const searchAssertions = searchExecutions.map((execution) => ({
    display: execution.display,
    reasons: assertSearchBodyCallMatchesScenario(execution, scenario),
  }));
  const matchingSearchCall = searchAssertions.find(
    (assertion) => assertion.reasons.length === 0,
  );

  if (matchingSearchCall !== undefined) {
    return [];
  }

  const lastAssertion = searchAssertions.at(-1);
  return lastAssertion === undefined
    ? ["no darty_search_body call matched the scenario request"]
    : [
        "no darty_search_body call matched the scenario request",
        `last darty_search_body call ${JSON.stringify(lastAssertion.display)}: ${lastAssertion.reasons.join("; ")}`,
      ];
};
