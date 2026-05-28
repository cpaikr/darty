# Evals

This directory holds scenario evals for Darty task usefulness and CLI-based agent tool use. It complements `test/`: tests verify implementation contracts, parser behavior, package exports, and CLI mechanics; evals verify whether a fixed command or a model can use the public CLI surface to complete realistic DART tasks.

## Layout

- `scenarios/` contains transport-independent task definitions and expected facts.
- `harness/` contains shared OpenAI chat-loop, tool trace, JSON, artifact, and reporting helpers.
- `surfaces/cli/` contains reusable fixed CLI and agent CLI surface wrappers while the staged runners stay under `search-body/`.
- `search-body/` keeps the existing staged CLI runners while shared code is extracted.

## Verification Boundaries

1. **Tests**: no LLM; deterministic implementation and package guarantees. Live DART drift checks belong in `test/live/`.
2. **Fixed CLI evals**: no LLM; run scenario commands against live DART and assert stdout envelopes.
3. **Agent tool-use evals**: LLM involved; assert objective tool traces, arguments, identifiers, ordering, envelopes, and no-result behavior.
4. **Final-answer evals**: LLM-judged layer for subjective answer quality. Deterministic trace checks still own objective tool-call facts.

## Public Surface Matrix

| Surface | Current evals | Purpose |
|---|---|---|
| CLI fixed command | `eval:cli:search-body` | Live stdout envelope sanity for known commands. |
| Agent CLI runner | `eval:agent-cli:search-body` | Whether a model can invoke the CLI runner with matching argv. |


## Commands

Fixed CLI eval, no OpenAI key required:

```bash
bun run eval:cli:search-body
```

Model-in-the-loop evals require `OPENAI_API_KEY` (usually through `.env.local` and `varlock`):

```bash
bun run env:check
bun run eval:agent-cli:search-body
```

Legacy script names remain available for the staged refactor:

```bash
bun run eval:search-body:cli
bun run eval:search-body:agent:cli
```

Set `OPENAI_MODEL` to override the default model.

## Gate Policy

CI and npm release publishing remain deterministic: `bun run typecheck`, `bun test`, and `bun run build` are the required automated gates because they do not depend on live DART or hosted model availability.

For manual release readiness, run `bun run eval:agent-cli:search-body` with the default OpenAI model family before cutting a release that changes CLI contracts, eval harness behavior, or answer-quality prompts.

Additional model families or exact model overrides are exploratory comparisons. Record their artifact paths and failures in the release notes or PR discussion, but do not treat them as blockers unless the project explicitly promotes that family to the default gate.

## Artifacts

Every model-in-the-loop eval writes one JSON artifact per scenario under:

```text
.tmp/evals/<suite>/<timestamp>/<scenario-id>.json
```

Artifacts include the model, scenario, pass/fail reasons, final answer, tool executions, and suite-specific metrics. Keep them ignored; use them to debug failures without rerunning live/model calls.

## Assertion Policy

Prefer deterministic JavaScript assertions for objective facts: command names, action names, arguments, validation failures, company codes, receipt handoff, section IDs, item counts, and no-result behavior. Use an LLM judge only when evaluating subjective final prose, such as whether a research answer is useful, cited, and avoids unsupported claims. Judge prompts and rubrics live under `judges/` and are versioned in code.
