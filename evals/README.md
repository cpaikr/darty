# Evals

This directory holds model-in-the-loop evals for `darty` tool use.

## Current stance

- Keep each eval track focused on one behavior boundary: a single capability such as `search-body`, or an explicit multi-step workflow that exercises tool chaining.
- Treat `search-body` as the current single-capability family and `workflows` as the current multi-step agent-native family.
- Use evals for agent/tool wiring behavior, not raw source correctness.
- Keep deterministic source, schema, transport, and CLI contract checks in `test/` and colocated `*.test.ts` files.
- Use deterministic assertions first. Add LLM judges only for subjective final-answer quality.

## Test boundary

The repo has three verification layers:

1. **Direct tool/API tests**
   - No LLM.
   - Prove the DART adapter and search-body capability work against source data.
   - Live upstream checks belong under `test/live/`.

2. **CLI scenario evals**
   - No LLM.
   - Prove fixed CLI commands return the expected live structured envelope through stdout.
   - These live under `evals/` when they are scenario-style checks rather than narrow subprocess behavior tests.

3. **Agent tool-use evals**
   - LLM involved.
   - Prove the configured model can use structured local tools, either through a CLI runner or typed `darty_*` calls, with appropriate arguments and identifier handoff.
   - These live under `evals/`.

Future MCP, Pi-native, SDK, or other adapter evals should be added only when
that adapter is active again. The archived MCP evals are preserved at git tag
`archive/mcp-before-removal`.

## Current tracks

- `search-body/cli/run-eval.ts`
  Fixed-command live CLI scenarios that parse stdout JSON and assert the shared search-body envelope.
- `search-body/agent-cli/run-eval.ts`
  Agentic CLI invocation runner where a model receives a structured local darty CLI runner and must call it with arguments that match the user request.
- `search-body/agent-native/run-eval.ts`
  Agent-native tool-use runner where a model receives typed `darty_*` tools backed directly by `src/app/*` operations.
- `workflows/agent-native/run-eval.ts`
  Multi-step agent-native workflow runner where a model must chain typed `darty_*` tools and hand identifiers from one result into the next call.

## Environment

`OPENAI_API_KEY` must be available in `.env.local` for agentic evals.

Useful commands:

```bash
bun run env:check
bun run eval:search-body:cli
bun run eval:search-body:agent:cli
bun run eval:search-body:agent:native
bun run eval:workflows:agent:native
```
