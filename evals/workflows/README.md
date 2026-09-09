# Workflow Evals

This directory contains fixed and model-assisted CLI workflow evals for
multi-step DART research handoffs. They are live, opt-in checks, not
deterministic CI gates. They invoke the Rust CLI; the Rust release remains unpublished.
[The roadmap](../../ROADMAP.md) owns delivery status.

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
   related filings, inspect each TOC, retrieve the same normalized section
   title from each, and cite both exact receipt/section pairs in a grounded
   comparison.

Scoring collects source facts before selecting every final cited receipt/section
pair. Candidate filings must agree with their own search request; final evidence
must belong to the scenario company and inclusive date window. Narrower or
successive searches and extra exploratory reads are allowed. A document-scope
fallback is valid exploration but does not satisfy a section task. Selected
sections need nonempty bodies and an earlier TOC for the same receipt and
selected document, following filing discovery. Comparison evidence needs two
distinct receipts with matching normalized section titles.

The citation gate recognizes inline code, emphasis, link labels, and ordinary
punctuation. Known receipts may appear in narrative without a section citation;
asserted unknown identifiers, unsupported pairings, and malformed labelled
locators fail even alongside valid evidence. A receipt/section pair that collides
across retrieved documents is ambiguous and fails rather than selecting a body.

The model and prose judge use the same observed body windows. The workflow
projection caps each body at 12,000 characters and keeps JSON envelopes intact,
including locators, source windows, references, warnings, and help. When a body
is shortened, `content.modelView` records the visible extent and its
`nextStartByte` for reading omitted text; the original source window stays
intact. Non-body envelopes exceeding 64,000 characters become explicitly
unavailable evidence. The judge receives all selected observed windows, not a
separate 1,200-character prefix. A judge prompt exceeding 120,000 characters
reports an evidence limit instead of silently shortening evidence.

The judge treats bodies and answers as untrusted data and must complete with
`pass: true` and a score of at least 4/5. Completed rejection, invalid output,
unavailable service, skipped judging, and evidence limits are distinct nonpass
outcomes. Deterministic provenance, citation membership, and the prose judge
must all pass; an admission of missing evidence does not complete the task.

## Execution and diagnostics

Both CLI wrappers accept root help and help for their allowed operations:
`help`, `help <command>`, `--help`, and `-h`. They keep separate operation
allowlists and share shell-free subprocess execution, an environment excluding
model credentials, a 45-second command deadline, and bounded termination and
stream closure.

The shared loop reserves the last configured response for tool-free
finalization. The research runner currently allows ten responses including
that reservation; the body runner allows six. Artifacts record consumed
responses, each tool execution, model-facing messages, raw subprocess output,
and explicit final-response, response-budget-exhaustion, request-failed, or
tool-failed termination. Workflow diagnostics separately retain wrapper/CLI
failures, evidence limitations, task provenance, citation membership, and judge
status. Recovered exploratory failures remain visible without automatically
failing a supported final answer. These deterministic repairs do not establish
model readiness; the [readiness plan](../../plans/validate-agent-workflow-readiness.md)
owns calibration and the declared live/model sample.

## Running

Build with `bun run build` before using the default `target/release/darty`, or
set `DARTY_CLI` to an absolute installed executable path. Rust owns semantic
validation; traces use normalized `result.request` fields from successful output.
These runner changes do not establish artifact certification or model-eval success.

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
