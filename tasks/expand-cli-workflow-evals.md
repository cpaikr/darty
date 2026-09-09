# Expand held-out CLI workflow evals

## Outcome

CLI workflow evaluation covers ambiguous company matches, amended reports,
stale section recovery, and truncated-section continuation after the baseline
workflow produces stable transcripts.

## Current state

The baseline workflow covers company lookup, filing search, report TOC, and
section retrieval. The held-out cases remain intentionally unscheduled but
are not required for rewrite parity.

## Next action

Reassess the held-out scenario set after the scheduled
[workflow readiness work](../plans/validate-agent-workflow-readiness.md)
produces a trustworthy baseline. The current repair work does not schedule this
scenario expansion.
