# Evals

This directory holds scenario evals for Darty task usefulness and agent tool use. It complements `test/`: tests verify implementation contracts, parser behavior, package exports, and adapter mechanics; evals verify whether a fixed command or a model can use an exposed surface to complete realistic DART tasks.

## Layout

- `scenarios/` contains transport-independent task definitions and expected facts.
- `harness/` contains shared OpenAI chat-loop, tool trace, JSON, artifact, and reporting helpers.
- `surfaces/` contains adapters and assertions for each evaluated surface.
  - `cli/` contains reusable fixed CLI and agent CLI surface wrappers while the staged runners stay under `search-body/`.
  - `pi/` evaluates the public single `darty(action, command?, inputJson?)` Pi tool.
  - `typed-agent/` is an internal diagnostic/control surface for direct `darty_*` tools.
- `suites/` contains top-level public-surface eval entrypoints.
- `search-body/` and `workflows/` keep the existing staged runners while shared code is extracted.

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
| Pi single tool | `eval:pi:search-body`, `eval:pi:workflow`, `eval:pi:recovery`, `eval:pi:research-answer` | Whether a model can use the public Pi `darty` tool, canonical commands, JSON input, validation/recovery, identifier chaining, and cited final-answer research. |
| Typed `darty_*` tools | `eval:typed:search-body`, `eval:typed:workflow` | Internal/reference coverage; not proof that the public Pi surface works. |

## Commands

Fixed CLI eval, no OpenAI key required:

```bash
bun run eval:cli:search-body
```

Model-in-the-loop evals require `OPENAI_API_KEY` (usually through `.env.local` and `varlock`):

```bash
bun run env:check
bun run eval:agent-cli:search-body
bun run eval:typed:search-body
bun run eval:typed:workflow
bun run eval:pi:search-body
bun run eval:pi:workflow
bun run eval:pi:recovery
bun run eval:pi:research-answer
bun run eval:pi:gate
```

Legacy script names remain available for the staged refactor:

```bash
bun run eval:search-body:cli
bun run eval:search-body:agent:cli
bun run eval:search-body:agent:native
bun run eval:workflows:agent:native
```

Set `OPENAI_MODEL` to override the default model. Set `OPENAI_JUDGE_MODEL` to override the final-answer judge model.

## Gate Policy

CI and npm release publishing remain deterministic: `bun run typecheck`, `bun test`, and `bun run build` are the required automated gates because they do not depend on live DART or hosted model availability.

For manual release readiness, run `bun run eval:pi:gate` with the default OpenAI model family before cutting a release that changes tool contracts, Pi adapter behavior, eval harness behavior, or answer-quality prompts. That gate covers the active public Pi surface: search-body, filing workflows, validation/recovery, and research answers. Agent CLI and typed-agent suites are diagnostic/exploratory unless the changed code specifically touches those surfaces.

Additional model families, exact model overrides, or alternate judge models are exploratory comparisons. Record their artifact paths and failures in the release notes or PR discussion, but do not treat them as blockers unless the project explicitly promotes that family to the default Pi gate.

Research-answer evals pass only when deterministic trace checks pass and the judge returns `pass: true` with a score at or above the rubric's `passingScore` (`4/5` as of rubric `2026-05-26`). Malformed judge JSON is a failed judged eval; the raw judge response is retained in the scenario artifact for debugging.

## Artifacts

Every model-in-the-loop eval writes one JSON artifact per scenario under:

```text
.tmp/evals/<suite>/<timestamp>/<scenario-id>.json
```

Artifacts include the model, scenario, pass/fail reasons, final answer, tool executions, and suite-specific metrics. Keep them ignored; use them to debug failures without rerunning live/model calls.

## Assertion Policy

Prefer deterministic JavaScript assertions for objective facts: command names, action names, arguments, validation failures, company codes, receipt handoff, section IDs, item counts, and no-result behavior. Use an LLM judge only when evaluating subjective final prose, such as whether a research answer is useful, cited, and avoids unsupported claims. Judge prompts and rubrics live under `judges/` and are versioned in code.
