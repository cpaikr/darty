# Workflow Evals

This directory contains fixed and model-assisted CLI workflow evals for
multi-step DART research handoffs. They are live, opt-in checks, not
deterministic CI gates.

## Current Track

`run-eval.ts` executes this subprocess workflow:

1. `search-company --agent` resolves Samsung Electronics to company code
   `00126380`.
2. `search-company-reports --agent` retrieves filing candidates and a receipt
   number.
3. `view-report --toc-depth 1` opens the filing table of contents.
4. `view-report --section-id ... --max-bytes 2000` retrieves one section window.

The eval asserts objective handoff facts: company code, receipt number, TOC
section ID, returned section body, `content.window.hasMore`, contextual
`help[]`, and output-size metrics for each step.

## Agent research track

`agent-run-eval.ts` reuses the shared OpenAI tool loop and artifact writer. It
runs two normal user tasks:

1. `exact-section-citation` requires the agent to resolve Samsung Electronics,
   select a filing, fetch that filing's TOC, fetch one returned section, and
   cite the exact `receiptNumber` and `sectionId` for that same report.
2. `related-filings-comparison` requires the agent to fetch two distinct
   related filings, inspect each TOC, retrieve a comparable section from each,
   and cite both exact receipt/section pairs in a grounded comparison.

The deterministic trace gate passes only when the required commands succeed,
the company and filing references are present, section bodies are non-empty,
each report search uses the scenario's required date range, every returned
filing has a valid receipt date inside that range, and every retrieved
receipt/section pair uses a section ID returned by the TOC for its own receipt.
A
separate final-answer judge then checks that the prose answers the task,
grounds claims in the returned body excerpts, and contains no invented or
cross-report identifiers. Both gates must pass for the scenario to pass.

The final-answer judge is intentionally model-assisted and uses an explicit
JSON rubric. It must return `pass: true` with a score of at least 4/5. It is not
a substitute for the deterministic CLI, parser, or fixture tests, and
live/model nondeterminism keeps this track outside required CI.

## Running

```bash
bun run eval:workflow:cli
```

For the opt-in agent workflow (requires `OPENAI_API_KEY`, normally loaded with
Varlock):

```bash
bun run env:check
bun run eval:workflow:agent
```

The run writes ignored evidence under `.tmp/evals/workflow-agent/`. Do not
claim that the agent workflow ran when credentials, network access, or a model
are unavailable; the static trace assertions can still be run through the
normal test suite.

## Follow-ups

Later held-out workflow cases belong in
[the workflow-eval task](../../tasks/expand-cli-workflow-evals.md): amended
reports, multiple similar company names, stale `sectionId` recovery, and
truncated section continuation.
