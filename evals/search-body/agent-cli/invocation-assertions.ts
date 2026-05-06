import type { SearchBodyCliScenario } from "../shared/cli-scenarios.ts";
import type { ToolExecution } from "./types.ts";
import { validateDartyCliArgv } from "./tools.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getStringArrayProperty = (
  value: Record<string, unknown>,
  key: string,
): readonly string[] | undefined => {
  const child = value[key];
  return Array.isArray(child) && child.every((item) => typeof item === "string")
    ? child
    : undefined;
};

const getDartyArgv = (execution: ToolExecution): readonly string[] | undefined => {
  if (execution.toolName !== "run_darty_cli" || !isRecord(execution.input)) {
    return undefined;
  }

  return getStringArrayProperty(execution.input, "argv");
};

const getStringOption = (
  options: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
};

const requireOptionValue = (
  reasons: string[],
  options: Record<string, unknown>,
  key: string,
  expectedValue: string,
): void => {
  const actualValue = getStringOption(options, key);

  if (actualValue !== expectedValue) {
    reasons.push(
      `expected --${key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)} ${expectedValue}, received ${actualValue ?? "<missing>"}`,
    );
  }
};

const assertSearchInvocationMatchesScenario = (
  execution: ToolExecution,
  scenario: SearchBodyCliScenario,
): readonly string[] => {
  const argv = getDartyArgv(execution);
  if (argv === undefined) {
    return ["execution was not a structured darty CLI invocation"];
  }

  const validation = validateDartyCliArgv(argv);
  const reasons: string[] = [];

  if (!validation.ok) {
    return [validation.reason];
  }
  if (validation.parsed.kind !== "search-body") {
    return ["darty CLI invocation was discovery/help, not search-body"];
  }

  const { options } = validation.parsed;

  requireOptionValue(reasons, options, "keyword", scenario.keyword);
  requireOptionValue(reasons, options, "startDate", scenario.startDate);
  requireOptionValue(reasons, options, "endDate", scenario.endDate);

  if (scenario.companyCode === undefined) {
    if (getStringOption(options, "companyCode") !== undefined) {
      reasons.push("received an unexpected --company-code filter");
    }
  } else {
    requireOptionValue(reasons, options, "companyCode", scenario.companyCode);
  }

  for (const narrowingOption of ["presenterName", "reportName"] as const) {
    if (getStringOption(options, narrowingOption) !== undefined) {
      reasons.push(
        `received an unexpected --${narrowingOption.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)} filter`,
      );
    }
  }

  if (execution.exitCode !== 0) {
    reasons.push(`search-body invocation exited with ${execution.exitCode}`);
  }

  return reasons;
};

export const evaluateAgentCliInvocation = (
  scenario: SearchBodyCliScenario,
  toolExecutions: readonly ToolExecution[],
): readonly string[] => {
  const reasons: string[] = [];

  if (toolExecutions.length === 0) {
    return ["agent never called the structured local CLI runner"];
  }

  const searchExecutions = toolExecutions.filter((execution) => {
    const argv = getDartyArgv(execution);
    if (argv === undefined) {
      return false;
    }

    const validation = validateDartyCliArgv(argv);
    return validation.ok && validation.parsed.kind === "search-body";
  });

  if (searchExecutions.length === 0) {
    reasons.push("agent never ran the search-body CLI");
    return reasons;
  }

  const searchRunAssertions = searchExecutions.map((execution) => ({
    display: execution.display,
    reasons: assertSearchInvocationMatchesScenario(execution, scenario),
  }));
  const matchingSearchRun = searchRunAssertions.find(
    (assertion) => assertion.reasons.length === 0,
  );

  if (matchingSearchRun === undefined) {
    const lastAssertion = searchRunAssertions.at(-1);
    reasons.push("no search-body invocation matched the scenario request");
    if (lastAssertion !== undefined) {
      reasons.push(
        `last search-body invocation ${JSON.stringify(lastAssertion.display)}: ${lastAssertion.reasons.join("; ")}`,
      );
    }
  }

  return reasons;
};
