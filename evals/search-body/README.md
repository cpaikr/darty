# Contents Search Evals

These evals cover Rust `search-body` through fixed CLI commands and model-backed
CLI tool use. Rust remains unpublished;
[the roadmap](../../ROADMAP.md) owns delivery status.

## Goal

The current tracks answer two questions:

- Can fixed CLI commands return the expected live structured stdout envelope?
- Can a configured model use a structured local darty CLI runner with arguments that match the user request?

Do not reintroduce non-CLI eval tracks unless a new public integration surface becomes an explicit product decision.

## Eval Track

### CLI

`cli/run-eval.ts` executes fixed local CLI commands and validates stdout JSON.

This track validates:

- the CLI success path works against live DART;
- stdout is a parseable shared result envelope;
- populated searches include concrete filing references;
- no-result searches stay empty and do not include invented filing references;
- each passing scenario reports `stdoutUtf8Bytes` and `envelopeJsonCharacters` as an output-size/token-proxy signal for response-shape regressions.

### Agentic CLI

`agent-cli/run-eval.ts` uses the configured OpenAI model through a small
tool-calling loop with one structured local tool for darty CLI execution.

This track validates the invocation boundary:

- the prompt is phrased as a normal user request, not as an eval instruction;
- the system prompt does not provide the exact `search-body` command shape;
- the agent/model uses the provided local CLI runner for DART data;
- the model can use CLI help output if needed;
- at least one `search-body` invocation uses valid CLI argument shape;
- the command arguments match the scenario request, including keyword, date range, and company-code filter when requested.

It requires a matching structured CLI invocation to exit successfully and the
bounded model loop to produce a final response. The six-response budget reserves
its last response for tool-free finalization; artifacts retain termination and
response/tool counts. This does not grade the final prose. Detailed stdout envelope correctness belongs to the fixed-command CLI eval. Final-answer quality is evaluated separately by the opt-in research workflow track in [`../workflows/`](../workflows/README.md).

Set `OPENAI_MODEL` to select the model (default `gpt-5.4-mini`).
Persisted diagnostics follow the [shared retention boundary](../README.md#gate-policy).

## Scenario Shape

Shared CLI scenarios live in `shared/cli-scenarios.ts` and are reused by the fixed-command and agentic CLI runners. The fixed-command runner uses each scenario's `argv`; the agentic CLI runner uses the CLI-oriented `task`.

Current scenarios stay narrow on purpose:

- populated live search should return at least one structured filing reference;
- explicit no-result handling should return an empty structured result;
- filtered live search should echo the company-code filter and return only matching company rows.

The search-body scenarios still stop at filing-level output. Multi-step report-viewing and section-window tasks live in `../workflows/`.

## Running

Install development dependencies and build the local Rust executable:

```bash
bun install
bun run build
```

The default executable is `target/release/darty`; set `DARTY_CLI` to an absolute
installed executable path to check that exact artifact. Rust validates arguments,
and invocation assertions use normalized `result.request` from successful output.

Run the fixed-command CLI eval. This track does not require an OpenAI API key:

```bash
bun run eval:cli:search-body
```

For the LLM-backed evals, create `.env.local` in the repo root with `OPENAI_API_KEY`, then validate the environment:

```bash
bun run env:check
```

Run the agentic CLI eval:

```bash
bun run eval:agent-cli:search-body
```

## Notes

- The live DART surface changes over time, so these are scenario evals, not golden-output tests.
- Source correctness belongs in Rust SDK tests and the independent wire fixtures.
- CLI subprocess UX checks belong in `test/compat/cli-v1/`; these evals focus on live scenario usefulness and structured tool invocation.
- Deterministic assertions are preferred here when output shape, echoed request parameters, item counts, receipt numbers, URL prefixes, or command arguments are objective.
- Do not add an `llm-rubric` judge to tracks where checks can be expressed in JavaScript.
- Do not fold final-answer prose checks into this invocation track; use the
  separate research workflow runner, which has an explicit final-answer judge
  and remains outside credential-free CI.
