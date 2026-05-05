# Contents Search Evals

These evals cover the current public `contents-search` capability through CLI and LLM-backed CLI tool-use paths.

## Goal

The current tracks answer two separate questions:

- Can fixed CLI commands return the expected live structured stdout envelope?
- Can a configured model use a structured local darty CLI runner with arguments that match the user request?

The archived MCP eval track is preserved at git tag `archive/mcp-before-removal`.
Do not reintroduce MCP, Pi-native, SDK, or other adapter evals until that adapter
is active again and justified.

## Eval Track

### CLI

`cli/run-eval.ts` executes fixed local CLI commands and validates stdout JSON.

This track validates:

- the CLI success path works against live DART;
- stdout is a parseable shared result envelope;
- populated searches include concrete filing references;
- no-result searches stay empty and do not include invented filing references.

### Agentic CLI

`agent-cli/run-eval.ts` evaluates `gpt-5.4-mini` by default through a small OpenAI tool-calling loop with one structured local tool for darty CLI execution.

This track validates the invocation boundary:

- the prompt is phrased as a normal user request, not as an eval instruction;
- the system prompt does not provide the exact `contents-search` command shape;
- the agent/model uses the provided local CLI runner for DART data;
- the model can use CLI help output if needed;
- at least one `contents-search` invocation uses valid CLI argument shape;
- the command arguments match the scenario request, including keyword, date range, and company-code filter when requested.

It only requires the matching structured CLI invocation to exit successfully. Detailed stdout envelope correctness belongs to the fixed-command CLI eval, and final-answer quality belongs in a separate future track.

Set `OPENAI_MODEL` to override the model.

## Scenario Shape

Shared CLI scenarios live in `shared/cli-scenarios.ts` and are reused by the fixed-command and agentic CLI runners. The fixed-command runner uses each scenario's `argv` and expected result facts; the agentic CLI runner uses each scenario's user-facing `task` and expected command arguments.

Current scenarios stay narrow on purpose:

- populated live search should return at least one structured filing reference;
- explicit no-result handling should return an empty structured result;
- filtered live search should echo the company-code filter and return only matching company rows.

The current capability does not support section retrieval yet, so these evals stop at filing-level tool output.

## Running

Install deps first:

```bash
bun install
```

Run the fixed-command CLI eval. This track does not require an OpenAI API key:

```bash
bun run eval:contents:cli
```

For the agentic CLI eval, create `.env.local` in the repo root with `OPENAI_API_KEY`, then validate the environment:

```bash
bun run env:check
```

Run the agentic CLI eval:

```bash
bun run eval:contents:agent:cli
```

## Notes

- The live DART surface changes over time, so these are scenario evals, not golden-output tests.
- Raw source correctness belongs in direct tests, especially `test/live/`.
- CLI subprocess UX checks belong in `test/cli/`; these evals focus on live scenario usefulness and agent structured-tool invocation behavior.
- Deterministic assertions are preferred here when output shape, echoed request parameters, item counts, receipt numbers, URL prefixes, or command arguments are objective.
- Do not add an `llm-rubric` judge to tracks where checks can be expressed in JavaScript.
- If we later want to evaluate final user-facing prose, add a separate final-answer track backed by a runner that explicitly treats final-answer quality as the thing under test.
