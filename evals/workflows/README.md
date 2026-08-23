# Workflow Evals

This directory contains fixed CLI workflow evals for multi-step DART research
handoffs. These are live, opt-in checks, not deterministic CI gates.

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

## Running

```bash
bun run eval:workflow:cli
```

## Follow-ups

Later held-out workflow cases belong in
[the workflow-eval task](../../tasks/expand-cli-workflow-evals.md): amended
reports, multiple similar company names, stale `sectionId` recovery, and
truncated section continuation.
