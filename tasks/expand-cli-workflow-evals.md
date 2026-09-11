# Expand held-out CLI workflow evals

## Intended outcome

CLI workflow evaluation covers ambiguous company matches, amended reports,
stale section recovery, and truncated-section continuation after the baseline
workflow produces stable transcripts.

## Current state

The baseline workflow covers company lookup, filing search, report TOC, and
section retrieval. The held-out cases remain intentionally unscheduled but
are not required for rewrite parity.

## Next action

Reassess the held-out scenario set using the completed
[readiness measurement](../docs/research/agent-workflow-readiness.md). Evaluator
repairs and fictional company-guidance tests do not establish live held-out
coverage or model reliability. This scenario expansion remains unscheduled.
