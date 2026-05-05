# Evals

This directory holds model-in-the-loop evals for `darty` tool use.

## Current stance

- Keep evals capability-scoped.
- Start with the implemented `contents-search` surface.
- Use evals for agent/tool wiring behavior, not raw source correctness.
- Keep deterministic source, schema, transport, CLI, and MCP contract checks in `test/` and colocated `*.test.ts` files.
- Use deterministic assertions first. Add LLM judges only for subjective final-answer quality.

## Test boundary

The repo has four verification layers:

1. **Direct tool/API tests**
   - No LLM.
   - Prove the DART adapter and contents-search capability work against source data.
   - Live upstream checks belong under `test/live/`.

2. **MCP contract tests**
   - No LLM.
   - Prove the local MCP server exposes the expected tool schema and returns the shared structured envelope.
   - These belong near the MCP server code.

3. **CLI scenario evals**
   - No LLM.
   - Prove fixed CLI commands return the expected live structured envelope through stdout.
   - These live under `evals/` when they are scenario-style checks rather than narrow subprocess behavior tests.

4. **Agent tool-use evals**
   - LLM involved.
   - Prove the configured model can use the structured local CLI runner with appropriate arguments, or can satisfy DART search tasks when the MCP server is attached and named in the task.
   - These live under `evals/`.

Final user-facing answer quality is a separate optional eval track. Do not mix it into a raw tool-use or invocation eval unless the runner performs the full loop and explicitly treats answer quality as the thing under test:

```text
user task -> model requests tool -> MCP tool result -> model writes final answer
```

## Current tracks

- `contents-search/cli/run-eval.ts`
  Fixed-command live CLI scenarios that parse stdout JSON and assert the shared contents-search envelope.
- `contents-search/agent-cli/run-eval.ts`
  Agentic CLI invocation runner where a model receives a structured local darty CLI runner and must call it with arguments that match the user request.
- `contents-search/mcp/promptfooconfig.yaml`
  Agentic MCP runner config where an LLM has the local MCP server attached. The actor currently uses Promptfoo's OpenAI chat provider because that is where local MCP attachment works.
- `contents-search/mcp/scenarios.yaml`
  DART search tasks and deterministic assertions for validating the structured MCP result envelope, request echo, and result facts.

## Why Promptfoo here

- TypeScript-friendly and easy to keep inside the repo.
- Supports attaching the local MCP server to a model provider.
- Gives a repeatable model-in-the-loop check that the configured provider can satisfy DART search tasks through the attached `contents-search` capability when the task names the darty MCP tool.

## Environment

`OPENAI_API_KEY` must be available in `.env.local` for agentic evals.

Useful commands:

```bash
bun run env:check
bun run eval:contents:cli
bun run eval:contents:agent:cli
bun run eval:contents:agent:mcp
```

The eval script stores Promptfoo state in repo-local `.promptfoo/` and disables SQLite WAL mode to avoid sandbox and filesystem issues from the default `~/.promptfoo` location.
