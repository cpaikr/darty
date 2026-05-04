# Evals

This directory holds model-in-the-loop evals for `darty` tool use.

## Current stance

- Keep evals capability-scoped.
- Start with the implemented `contents-search` surface.
- Use evals for agent/tool wiring behavior, not raw source correctness.
- Keep deterministic source, schema, transport, CLI, and MCP contract checks in `test/` and colocated `*.test.ts` files.
- Use deterministic assertions first. Add LLM judges only for subjective final-answer quality.

## Test boundary

The repo has three verification layers:

1. **Direct tool/API tests**
   - No LLM.
   - Prove the DART adapter and contents-search capability work against source data.
   - Live upstream checks belong under `test/live/`.

2. **MCP contract tests**
   - No LLM.
   - Prove the local MCP server exposes the expected tool schema and returns the shared structured envelope.
   - These belong near the MCP server code.

3. **Agent tool-use evals**
   - LLM involved.
   - Prove the configured model can invoke the MCP tool and receive valid structured output.
   - These live under `evals/`.

Final user-facing answer quality is a separate optional eval track. Do not mix it into the current tool-use eval unless the runner performs the full loop:

```text
user task -> model requests tool -> MCP tool result -> model writes final answer
```

## Current tracks

- `contents-search/promptfooconfig.agent.mcp.yaml`
  Agentic MCP runner config where an LLM uses the local MCP server. The actor currently uses Promptfoo's OpenAI chat provider because that is where local MCP attachment works.
- `contents-search/scenarios.agent.mcp.yaml`
  Scenario-first task definitions and deterministic assertions for validating tool invocation and structured tool output.

## Why Promptfoo here

- TypeScript-friendly and easy to keep inside the repo.
- Supports attaching the local MCP server to a model provider.
- Gives a repeatable model-in-the-loop check that the configured provider can call `contents-search`.

## Environment

`OPENAI_API_KEY` must be available in `.env.local` for the MCP agentic eval.

Useful commands:

```bash
bun run env:check
bun run eval:contents:agent:mcp
```

The eval script stores Promptfoo state in repo-local `.promptfoo/` and disables SQLite WAL mode to avoid sandbox and filesystem issues from the default `~/.promptfoo` location.
