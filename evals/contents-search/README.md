# Contents Search Evals

These evals cover the current public `contents-search` capability through CLI and LLM-backed tool-use paths.

## Goal

The current tracks answer three separate questions:

- Can fixed CLI commands return the expected live structured stdout envelope?
- Can a configured model use a structured local darty CLI runner with arguments that match the user request?
- Can a configured model with the local MCP server attached satisfy DART search tasks through the `contents-search` result envelope?

The MCP Promptfoo track is not currently a final-answer quality eval. Raw output such as `MCP Tool Result (contents-search): ...` is acceptable there because Promptfoo exposes the structured tool result directly for deterministic assertions. The scenario prompts name the darty MCP tool so this track focuses on intended use and result behavior, not arbitrary host-agent tool-discovery probability.

## Eval Track

### CLI

`run-cli-eval.ts` executes fixed local CLI commands and validates stdout JSON.

This track validates:

- the CLI success path works against live DART;
- stdout is a parseable shared result envelope;
- populated searches include concrete filing references;
- no-result searches stay empty and do not include invented filing references.

### Agentic CLI

`run-agent-cli-eval.ts` evaluates `gpt-5.4-mini` by default through a small OpenAI tool-calling loop with one structured local tool for darty CLI execution.

This track validates the invocation boundary:

- the prompt is phrased as a normal user request, not as an eval instruction;
- the system prompt does not provide the exact `contents-search` command shape;
- the agent/model uses the provided local CLI runner for DART data;
- the model can use CLI help output if needed;
- at least one `contents-search` invocation uses valid CLI argument shape;
- the command arguments match the scenario request, including keyword, date range, and company-code filter when requested.

It only requires the matching structured CLI invocation to exit successfully. Detailed stdout envelope correctness belongs to the fixed-command CLI eval, and final-answer quality belongs in a separate future track.

Set `OPENAI_MODEL` to override the model.

### Agentic MCP

`promptfooconfig.agent.mcp.yaml` evaluates `gpt-5.4-mini` through Promptfoo's OpenAI chat provider with the local MCP server attached.

This track validates:

- DART search tasks that explicitly name the darty MCP tool can be satisfied through the attached `contents-search` capability;
- the returned output contains the shared structured success envelope;
- the echoed request matches the task, including required company-code filters and absence of unrequested narrowing filters;
- populated live searches include non-empty filing data and a concrete DART filing reference;
- explicit no-result searches stay empty and do not invent filing references.

## Scenario Shape

Shared CLI scenarios live in `cli-scenarios.ts` and are reused by the fixed-command and agentic CLI runners. The fixed-command runner uses each scenario's `argv` and expected result facts; the agentic CLI runner uses each scenario's user-facing `task` and expected command arguments.

The Promptfoo MCP runner and scenario data are split:

- `promptfooconfig.agent.mcp.yaml`
  Runner config: model, MCP attachment, and shared execution settings.
- `scenarios.agent.mcp.yaml`
  Task definitions plus deterministic JavaScript assertions.
- `mcp-assertions.js`
  Shared Promptfoo JavaScript assertions for extracting the MCP result envelope and checking request/result facts.

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

Create `.env.local` in the repo root with `OPENAI_API_KEY`, then validate the environment:

```bash
bun run env:check
```

Run the fixed-command CLI eval:

```bash
bun run eval:contents:cli
```

Run the agentic CLI eval:

```bash
bun run eval:contents:agent:cli
```

Run the agentic MCP eval:

```bash
bun run eval:contents:agent:mcp
```

## Notes

- The live DART surface changes over time, so these are scenario evals, not golden-output tests.
- Raw source correctness belongs in direct tests, especially `test/live/`.
- MCP schema and transport correctness belongs near the MCP server tests.
- CLI subprocess UX checks belong in `test/cli/`; these evals focus on live scenario usefulness and agent structured-tool invocation behavior.
- MCP tool-selection probability is not an app contract. Scenario prompts intentionally name the darty MCP tool; keep this Promptfoo track small and treat deterministic MCP schema/transport behavior as `src/mcp/server.test.ts` territory.
- The MCP package script disables Promptfoo provider caching so each run exercises the current model, MCP server, and tool path.
- Deterministic assertions are preferred here when output shape, echoed request parameters, item counts, receipt numbers, URL prefixes, or command arguments are objective.
- Do not add an `llm-rubric` judge to tracks where checks can be expressed in JavaScript.
- If we later want to evaluate final user-facing prose, add a separate final-answer track backed by a runner that explicitly treats final-answer quality as the thing under test.
