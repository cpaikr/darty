# Improve CLI guidance and establish workflow readiness evidence

## Outcome

The repaired evaluations measure the current CLI under a declared, repeatable
agent setup. Company guidance avoids unsupported identity selection, discovery
and recovery are usable, and a concise source-bound report distinguishes product
correctness from remaining model limitations for the release operator.

## Current state

Scheduled, not implemented. Requires the outcome of
[trustworthy workflow evaluation](repair-workflow-evaluation.md).

At baseline `a40b82adc8ce0137ec82afc98c473b40bf94d363`, source-bound CI and the
build-only candidate passed. Fixed live CLI workflows and all three body-agent
scenarios passed. The repaired local OpenAI credential worked on 2026-09-09;
credentials must be revalidated without displaying or committing them.

The research model failed to finish both original tasks. An onboarding control
completed section retrieval, but the comparison control read two sections from
one filing. The direct CLI comparison succeeded. No SDK parsing or transport bug
was demonstrated by these cases. The English company query returned unrelated
DART candidates; current CLI help nevertheless recommends the first candidate.

## Next action

After evaluator repairs land, reproduce ambiguous-company guidance with
fictional source responses, correct the hint policy, and establish neutral
workflow onboarding and a fixed evaluation protocol before any paid run.

## CLI guidance and compatibility

`crates/darty-cli/src/main.rs` owns company-search presentation. Preserve all
returned candidates, their ordering, identifiers, and SDK search semantics.

- When multiple candidates exist, or result completeness does not establish a
  unique candidate, require the caller to select the intended returned company
  before searching filings. Show names/codes and a placeholder follow-up command;
  do not silently promote the first row as the intended company.
- A unique result may supply its name/code in a contextual next step, while
  making clear that identity must match the caller's intent. Unknown totals or
  further pages must not be presented as a unique match.
- Explain that company-name queries follow DART's search behavior; a Korean
  registered name can help disambiguate. Do not invent an English translation,
  fuzzy identity service, extra provider query, or SDK match-confidence field.
- Preserve zero-result recovery and stock-code versus company-code guidance.
  Keep successful direct and agent presentations truthful under ambiguity.
- Preserve CLI v1 operations, flags, stdout/stderr, errors, and exit codes.
  The intentional change is contextual guidance. Review any necessary golden
  delta individually against this policy; never regenerate expectations from
  the implementation or globally replace expected output to force green tests.

Validate through the release-built CLI with unique, ambiguous, misleading-first,
empty, and incomplete/paginated fictional company results. Confirm the caller
can still select a returned code and complete the existing filing/TOC/section
workflow. Rebuild fixture and production artifacts separately when needed.

## Neutral agent setup and declared budgets

Use only public CLI help and returned evidence to guide the agent. Instruct it
to inspect root/command help before guessing unfamiliar syntax, choose a company
by returned identity, choose filings appropriate to the requested comparison,
and recover from a no-TOC filing by selecting another returned filing when the
task requires sections. Keep the two original task intents and windows.

Do not inject Samsung's code, known successful receipts, section IDs, golden
answers, or a forced call sequence into the model prompt. A fixed diagnostic
script may use a deterministic selection strategy, but report it separately from
model performance. Task-specific code/IDs already present in public CLI help are
part of the actual surface and must not be fabricated or hidden for the eval.

Declare the workflow response limit and bounded finalization behavior before the
measurement batch. Derive the limit from required discovery, two filing/TOC/section
paths, and bounded recovery; document the choice rather than increasing it after
each failure. Preserve finite provider deadlines, serial low-volume requests,
and no automatic DART retry. Use the existing runner configuration; do not add a
new scheduler, plugin, agent framework, or open-ended autonomous research loop.

## Measurement protocol

Freeze the implementation revision, executable digest, prompts, budgets, model,
judge model, and scenario list before measuring. Use the repository's default
`gpt-5.4-mini` for agent and judge; a model change is a separate experiment and
cannot replace the declared baseline. Existing credential-loading policy applies;
do not print secrets, copy them into artifacts, or store them in source control.

Run the following serially against an absolute `DARTY_CLI` artifact path:

1. The existing fixed body-search and fixed report workflow checks.
2. One complete three-scenario default-model body-search suite to detect shared
   runner regressions.
3. Three declared repetitions of each existing research scenario, preserving all
   six outcomes. Report them as a small diagnostic sample, not a statistical
   reliability guarantee. Do not retry until green or discard failed attempts.

Each research success requires eligible source-backed evidence, exact citation
membership/provenance, the intended one/two-filing task, and a completed passing
prose judge. Record response/tool counts, termination reason, selected public
identifiers, returned content scope/windows, and the judge result. Keep bounded
ignored diagnostics needed to audit failures; do not commit live document bodies
or claims of human approval. Preserve retention and access boundaries in the
[provider record](../docs/research/dart-provider-qualification.md).

Classify every unsuccessful attempt as runner/evaluator defect, CLI/SDK contract
failure, provider availability/drift, model planning/task failure, evidence-context
limitation, or judge service/format/final-answer failure. Investigate reproducible
implementation failures; add fictional regressions and make only fixes necessary
for the named outcomes. A broader new capability or model/platform replacement
is outside this plan. After any implementation/prompt change, invalidate the
mixed-revision batch and run one fresh declared batch; retain the earlier results.
Do not broaden paid experimentation beyond these necessary batches without a
new reason and explicit scope decision.

## Acceptance and release boundary

- The guidance policy passes independent CLI regressions and the existing CLI
  compatibility judge, with only reviewed intentional guidance differences.
- The repaired harness completes a successful deterministic same-report citation
  path and a two-report comparison path through the installed CLI; test failures
  caused by the identified harness defects are gone.
- The declared model sample is complete and every outcome has an evidence-backed
  disposition. No confirmed in-scope CLI/evaluator defect is left hidden behind
  a generic model-failure label. Remaining model limitations are recorded honestly.
- Model success is not manufactured by loosening provenance, deleting scenarios,
  changing models mid-batch, or selecting only passing runs. This plan promises
  trustworthy measurement and the specified guidance repair, not guaranteed
  success by a stochastic model.
- Preserve the existing release gate policy: a required evaluation failure stays
  unresolved for the release operator. Do not waive gates, claim readiness,
  create a tag, publish, or fabricate provider approval. Goal completion and
  production release approval are separate outcomes.

Record one concise durable readiness report under
`docs/research/agent-workflow-readiness.md`: tested source/artifact identity,
protocol, per-scenario outcomes, defect dispositions, and the remaining release
hold or evidence handoff. Do not duplicate model transcripts or a second release
runbook. Link it from the canonical [eval policy](../evals/README.md) and
[release handoff](../docs/release.md#rust-release-handoff). Reconcile affected
workflow/eval usage docs; preserve the historical rewrite contract and unrelated
backlog. Expansion to amended filings, stale-section recovery, and other held-out
scenarios remains in the existing task pool.

## Validation and completion

Run targeted new regressions, `bun run typecheck`, `bun test`,
`bun run check:dart-wire`, `bun run build`, and `bun run test:compat:cli`.
Run workspace tests and Clippy required by repository CI for the Rust guidance
change. Use `bun run eval:cli:search-body`, `bun run eval:workflow:cli`,
`bun run eval:agent-cli:search-body`, and `bun run eval:workflow:agent` for the
specified serial sample; set `DARTY_CLI` to the exact tested executable.

Complete bounded code review, scoped documentation harmonization, and reviewed
PR delivery. Finish when guidance and deterministic fixes pass, the declared
measurement and source-bound report are complete, and all remaining release
conditions have explicit dispositions. The next milestone is operator release
signoff/publication; do not begin it as part of this repair goal.
