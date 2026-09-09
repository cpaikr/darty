# Make workflow evaluation trustworthy

## Outcome

The existing section-citation and related-filings evaluations faithfully expose
CLI behavior and judge supported final evidence. Valid discovery, exploration,
document fallback, and citation formatting cannot produce false product failures;
invented identifiers, unsupported claims, and incomplete tasks still fail.

## Current state

Complete on the goal integration branch through
[PR #33](https://github.com/cpaikr/darty/pull/33), merged as `6582be9`.
Implementation `feee209` and feedback `d4ab47c` preserve individual commits.

The evaluator accepts supported help, document fallback, narrower searches,
exploration, and ordinary citation formatting without weakening final evidence
eligibility. Candidate integrity is separate from selected company/date/title
checks. Selected sections require prior filing discovery and the receipt's own
document-scoped TOC. Unknown, malformed, cross-report, and ambiguous citations
remain nonpass outcomes. Model and judge share bounded observed windows, with
raw subprocess output retained separately. Loop termination, wrapper/CLI
failures, evidence limits, and judging outcomes are explicit.

[Workflow documentation](../evals/workflows/README.md) owns implemented scoring,
window budgets, and diagnostics. Both original task intents remain unchanged.
This repair establishes deterministic evaluator behavior, not model readiness.

## Validation

- Reproduced six original false negatives before repair. Independent regression
  pairs cover discovery, final-evidence selection, provenance/order, Markdown and
  malformed citations, document recovery, windows, finalization, and judging.
- Local typecheck and 110 tests pass, plus wire/version checks and 18 real CLI
  help/wrapper comparisons. Documentation links and roadmap invariants pass.
- Bounded independent implementation and feedback reviews completed. Both initial
  hosted code reviews completed; all CodeRabbit findings have accepted dispositions
  and resolved threads. No paid model evaluations were used for these fixes.
- [CI 34314243238](https://github.com/cpaikr/darty/actions/runs/34314243238) passed
  repository validation, all four cross-builds, Linux runtime certification, SDK
  certification, and bundle assembly for `d4ab47c`.

## Next action

None for this completed result. The active goal separately includes
[CLI guidance and readiness measurement](validate-agent-workflow-readiness.md).
