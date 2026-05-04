# Evals

This directory holds agent task evals for real `darty` tool use.

Current stance:

- keep evals capability-scoped
- start with the implemented `contents-search` surface
- use evals for model-in-the-loop task completion, not raw transport checks
- keep deterministic transport and contract verification in `test/`

Current tracks:

- `contents-search/promptfooconfig.agent.mcp.yaml`
  Agentic MCP runner config where an LLM uses the local MCP server to answer user-like tasks. The actor currently uses Promptfoo's OpenAI chat provider because that is where local MCP attachment works.
- `contents-search/scenarios.agent.mcp.yaml`
  Scenario-first task definitions and expected outcomes for grading.

Why Promptfoo here:

- TypeScript-friendly and easy to keep inside the repo
- supports MCP integration for model providers
- supports `llm-rubric` grading so outputs can be judged against expected outcomes without custom scorer code

General rules:

- keep deterministic assertions first; use model grading second
- give judge prompts the output they are grading, not just the user task
- keep live DART evals small and explicit because upstream data changes
- run agentic evals repeatedly when variance matters

Current env requirements:

- `OPENAI_API_KEY` in `.env.local` for `llm-rubric` grading and the MCP agentic eval

Current commands:

- `bun run env:check`
- `bun run eval:contents:agent:mcp`

The eval script stores Promptfoo state in repo-local `.promptfoo/` and disables SQLite WAL mode to avoid sandbox and filesystem issues from the default `~/.promptfoo` location.
