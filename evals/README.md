# Evals

Evals measure realistic task usefulness through the Rust CLI subprocess.
Repository cutover is in progress and Rust remains unpublished;
[the rewrite plan](../plans/rust-sdk-node-sdk-cli-rewrite.md) owns delivery status.
Tests own deterministic contracts, parsers, SDK consumers, and CLI mechanics.

## Current tracks

| Track | Command | Boundary |
|---|---|---|
| Fixed body search | `bun run eval:cli:search-body` | Live stdout envelope and filing references |
| Fixed report workflow | `bun run eval:workflow:cli` | Company → filings → TOC → section handoff |
| Agent body search | `bun run eval:agent-cli:search-body` | Model-selected CLI arguments and invocation |
| Agent research workflow | `bun run eval:workflow:agent` | Exact-section citation and related-filing comparison with a final-answer judge |

The runners default to `target/release/darty`. Set `DARTY_CLI` to the absolute
path of an installed executable to evaluate that exact artifact. Rust owns
argument validation; trace assertions read normalized `result.request` fields
from successful CLI output. The fixed tracks do not judge prose; the separate agent research workflow owns the explicit
final-answer rubric and judge rather than making answer quality an implied
property of every runner.

## Boundaries

- Deterministic tests and the black-box judge assert schemas, errors, arguments,
  identifiers, ordering, stdout/stderr, and exit behavior.
- Live CLI evals check source-dependent scenario usefulness, not golden bytes.
- Agent invocation evals assert objective tool traces. The research workflow
  track adds a separate final-answer judge because citation fidelity and a
  multi-filing comparison require a subjective answer-quality decision.
- Live and hosted-model checks are manual because upstream and model
  availability are not deterministic CI dependencies.

## Running

Build the local executable with `bun run build`, or set `DARTY_CLI` to an
existing installed executable. Fixed evals do not require an OpenAI key:

```sh
bun run eval:cli:search-body
bun run eval:workflow:cli
```

The agent eval requires `OPENAI_API_KEY`, normally through `.env.local` and
Varlock:

```sh
bun run env:check
bun run eval:agent-cli:search-body
```

The model-assisted research workflow uses the same key and can use a separate
judge model:

```sh
bun run eval:workflow:agent
```

Set `OPENAI_MODEL` and optionally `OPENAI_JUDGE_MODEL` to select the agent and
final-answer judge models. This track is live and model-dependent; it is an
opt-in manual/readiness check and is never a credential-free CI requirement.

`OPENAI_MODEL` overrides the agent runner's default.

## Gate policy

The deterministic gate covers the wire lock, Rust checks, tooling/Node facade
typechecks and tests, CLI judge, mutation proof, and SDK consumer checks.
[The release runbook](../docs/release.md) owns CI and artifact certification
requirements; adapting these runners does not establish completed artifact checks.
Live/model evals remain manual. Run the default-model agent eval and the
research workflow eval before release-readiness signoff when changing CLI
contracts, the eval harness, or answer-quality prompts. A passing workflow
scenario requires both deterministic trace criteria and the final-answer
judge; inspect the ignored artifact before treating a pass as release evidence.

Model-in-the-loop runs write ignored JSON artifacts under
`.tmp/evals/<suite>/<timestamp>/`. Use them to diagnose trace and assertion
failures without treating them as durable documentation.
