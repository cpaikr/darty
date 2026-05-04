# Contents Search Evals

These evals cover the current public `contents-search` capability through an LLM-backed MCP path.

## Goal

The current Promptfoo track is an **agent tool-use eval**. It answers this question:

> Can the configured model invoke the local `contents-search` MCP tool and receive the expected structured output?

It is not currently a final-answer quality eval. Raw output such as `MCP Tool Result (contents-search): ...` is acceptable in this track because it proves the tool path was used and exposes the structured result for deterministic assertions.

## Eval Track

### Agentic MCP

`promptfooconfig.agent.mcp.yaml` evaluates `gpt-5.4-mini` through Promptfoo's OpenAI chat provider with the local MCP server attached.

This track validates:

- the agent/model can call the `contents-search` MCP tool;
- the returned output contains the shared structured success envelope;
- populated live searches include non-empty filing data and a concrete DART filing reference;
- explicit no-result searches stay empty and do not invent filing references.

## Scenario Shape

The Promptfoo runner and scenario data are split:

- `promptfooconfig.agent.mcp.yaml`
  Runner config: model, MCP attachment, and shared execution settings.
- `scenarios.agent.mcp.yaml`
  Scenario-first task definitions plus deterministic JavaScript assertions.

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

Run the agentic MCP eval:

```bash
bun run eval:contents:agent:mcp
```

## Notes

- The live DART surface changes over time, so these are scenario evals, not golden-output tests.
- Raw source correctness belongs in direct tests, especially `test/live/`.
- MCP schema and transport correctness belongs near the MCP server tests.
- The package script disables Promptfoo provider caching so each run exercises the current model, MCP server, and tool path.
- Deterministic assertions are preferred here because output shape, echoed request parameters, item counts, receipt numbers, and URL prefixes are objective.
- Do not add an `llm-rubric` judge to this track for checks that can be expressed in JavaScript.
- If we later want to evaluate final user-facing prose, add a separate final-answer track backed by a runner that performs the second model pass after tool execution.
