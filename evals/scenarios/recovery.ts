export type RecoveryScenario = {
  readonly id: string;
  readonly description: string;
  readonly task: string;
};

export const recoveryScenarios = [
  {
    id: "pi-validate-repair-search-body-date",
    description: "validate a malformed search-body request, repair it, and run successfully",
    task: `Use the darty Pi tool to search DART filing contents for the keyword "배당" between the malformed date range start=2025-03-31 and end=20260331. First call validate with that date exactly as provided so you can see the validation feedback. If validation fails, inspect help if needed, repair the input, then run the search.`,
  },
] as const satisfies readonly RecoveryScenario[];
