# Improve CLI guidance and establish workflow readiness evidence

## Outcome

The repaired evaluations measure the current CLI under a declared, repeatable
agent setup. Company guidance avoids unsupported identity selection, and a
source-bound report distinguishes product correctness from remaining model
limitations for the release operator.

## Current state

Complete on the goal integration branch through
[PR #35](https://github.com/cpaikr/darty/pull/35), merged as `25c5089` after
[PR #33](https://github.com/cpaikr/darty/pull/33). Individual commits are preserved.

Company guidance requires identity selection unless complete singleton pagination
establishes one candidate; source order, identifiers, SDK semantics, and empty
recovery are preserved. Neutral onboarding uses public help and returned evidence.
The declared response budgets reserve bounded finalization, and deterministic
same-report/comparison checks pass through the installed production CLI.

The [readiness report](../docs/research/agent-workflow-readiness.md) owns frozen
source/artifact identity, the serial protocol, all outcomes, defect dispositions,
and diagnostic limits. Baseline body 2/3 and research 1/6 remain retained beside
the required post-review body 3/3 and research 2/6. Fixed checks passed in both.
The completed measurement does not establish model reliability or release approval.

## Validation

- Fictional release-CLI cases and reviewed golden deltas cover unique, ambiguous,
  misleading-first, empty, partial, and paginated company results; direct tests
  cover unknown pagination. CLI compatibility passed 69 scenarios.
- Local Rust workspace tests, Clippy, release build, typecheck, wire/version
  checks, and 113 Bun tests passed. Diagnostic defects were reproduced and fixed
  with regressions; fresh measurement followed the final implementation change.
- Bounded independent implementation, feedback, and evidence reviews and scoped
  documentation reconciliation passed. Codex completed without findings; all
  three CodeRabbit threads resolved, including withdrawal of a suggestion that
  would hide actual source failures. No PR feedback requires human judgment.
- Final source `3b49aaa` passed all ten jobs in
  [CI 34318918453](https://github.com/cpaikr/darty/actions/runs/34318918453), including
  repository validation, four cross-builds, Linux runtime certification, SDK
  certification, and bundle assembly.

## Next action and release boundary

None for this completed result. Research readiness remains on hold under the
[release handoff](../docs/release.md#rust-release-handoff). Main promotion,
operator/provider signoff, release tagging, publication, and further model
experiments were not started. Goal completion promises the specified repair and
trustworthy evidence, not guaranteed stochastic model success.
