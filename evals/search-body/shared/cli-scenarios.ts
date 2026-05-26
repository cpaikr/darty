import { searchBodyScenarios, type SearchBodyScenario } from "../../scenarios/search-body.ts";

export type SearchBodyCliScenario = SearchBodyScenario & {
  readonly argv: readonly string[];
  readonly task: string;
  readonly agentNativeTask: string;
};

export const searchBodyCliScenarios = searchBodyScenarios.map((scenario) => ({
  ...scenario,
  argv: scenario.fixedCli?.argv ?? [],
  task: scenario.prompts.cliAgent,
  agentNativeTask: scenario.prompts.typedAgent,
})) satisfies readonly SearchBodyCliScenario[];
