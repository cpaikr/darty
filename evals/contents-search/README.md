# Contents Search Evals

These evals cover the current public `contents-search` capability only.

## Goals

- verify that live DART responses still contain enough filing references to answer user tasks
- verify that an LLM using the MCP tool can return a cited answer without inventing missing facts
- keep this directory focused on agent task completion rather than raw transport parity

## Eval Tracks

### Agentic MCP

`promptfooconfig.agent.mcp.yaml` evaluates `gpt-5.4-mini` through Promptfoo's OpenAI chat provider with the local MCP server attached.

This track answers the higher-level question: can an agent use the current tool and return a useful cited answer from live DART data?

## Scenario Shape

The Promptfoo runner and the scenario data are split:

- `promptfooconfig.agent.mcp.yaml`
  Runner config: model, MCP attachment, and shared execution settings.
- `scenarios.agent.mcp.yaml`
  Scenario-first task definitions plus expected outcomes for grading.

Current scenarios stay narrow on purpose:

- populated live search should return at least one filing reference
- explicit no-result handling without invented references

The current capability does not support section retrieval yet, so these evals stop at filing-level answers.

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
- Raw transport parity belongs in `test/`, not in this directory.
- The final answer format is intentionally flexible; the eval checks faithfulness and reference use rather than strict response schemas.
- The actor uses `openai:chat:gpt-5.4-mini` because Promptfoo's local MCP attachment is wired there. The rubric judge can still use `openai:responses:gpt-5.4-mini` independently.
- `llm-rubric` is the LLM judge here. It grades the answer against the scenario's expected outcome, with `threshold: 1` so low-score outputs cannot pass by default.
- Keep deterministic assertions for hard constraints such as non-empty answers and reference/no-reference behavior.
- If MCP agent runs become noisy, repeat them instead of silently weakening the rubric.
