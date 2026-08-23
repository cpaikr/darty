# Evals

Evals measure realistic task usefulness through the shipped TypeScript CLI.
Tests own deterministic contracts, parsers, package exports, and CLI mechanics;
the Rust candidate is validated separately by its SDK tests, candidate CLI
judge profile, and package acceptance.

## Current tracks

| Track | Command | Boundary |
|---|---|---|
| Fixed body search | `bun run eval:cli:search-body` | Live stdout envelope and filing references |
| Fixed report workflow | `bun run eval:workflow:cli` | Company → filings → TOC → section handoff |
| Agent body search | `bun run eval:agent-cli:search-body` | Model-selected CLI arguments and invocation |

The runners invoke the shipped `src/cli.ts` surface. There is no current
final-answer judge; final-answer quality remains a planned, separately owned
track rather than an implied fourth runner.

## Boundaries

- Deterministic tests and the black-box judge assert schemas, errors, arguments,
  identifiers, ordering, stdout/stderr, and exit behavior.
- Live CLI evals check source-dependent scenario usefulness, not golden bytes.
- Agent evals assert objective tool traces. An LLM judge should be added only
  for an explicit subjective final-answer rubric.
- Live and hosted-model checks are manual because upstream and model
  availability are not deterministic CI dependencies.

## Running

Fixed evals do not require an OpenAI key:

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

The older `eval:search-body:*` script aliases remain equivalent during the
staged harness refactor. `OPENAI_MODEL` overrides the agent runner's default.

## Gate policy

Required branch CI runs the wire lock, TypeScript typecheck/tests/build, full
CLI judge and mutation proof, Rust checks, and candidate package acceptance.
Live/model evals remain manual. Run the default-model agent eval before release
readiness signoff when changing CLI contracts, the eval harness, or
answer-quality prompts.

Model-in-the-loop runs write ignored JSON artifacts under
`.tmp/evals/<suite>/<timestamp>/`. Use them to diagnose trace and assertion
failures without treating them as durable documentation.
