# Goal: Repair agent workflow readiness

Status: active
Planning scope: ROADMAP.md

## Original contract

Goal contract

- Outcome: Repair workflow evaluation and CLI guidance, then produce trustworthy evidence of agent workflow readiness.
- Goal state: /Users/sejunpark/IT/darty/goals/repair-agent-workflow-readiness.md
- Included results and sources (semantic results define scope; paths supply detail):
  - Trustworthy discovery, evidence scoring, citations, bounded execution, and judging — /Users/sejunpark/IT/darty/plans/repair-workflow-evaluation.md
  - Ambiguous-company guidance, neutral onboarding, declared paid model evaluations, and readiness evidence — /Users/sejunpark/IT/darty/plans/validate-agent-workflow-readiness.md
- Complete when: Every included result achieves its cited outcome and applicable completion criteria within its named semantic boundary; repository-required validation and review pass; planning is truthful; Delivery finishes.
- Excluded: Operator release qualification and signoff, release tagging, and publication.
- Authority: Execute only included results and necessary supporting work; record anything else and ask before scope expansion or external actions not covered by this contract and Delivery.
- Resume: Initialize this contract with $progress goal mode before work; recover it before every resume, continuation, compaction, or handoff; stop if recovery fails.
- Delivery: PR delivery — use $progress's PR lifecycle and the fewest sequential reviewable PRs; finish each through $create-pr and $address-pr-feedback before starting the next, including the final implementation slice.

## Authorized amendments

_None._

## Execution status

### Completed included results

- Trustworthy workflow evaluation delivered through [PR #33](https://github.com/cpaikr/darty/pull/33), merged as `6582be9`; implementation `feee209` and feedback `d4ab47c` retained. Full [CI 34314243238](https://github.com/cpaikr/darty/actions/runs/34314243238) passed; all review threads resolved.

### Current in-scope result

Ambiguous-company guidance, neutral onboarding, declared paid model evaluations, and readiness evidence.

### Next in-scope action

Deliver the guidance and source-bound readiness report through the final implementation PR; then perform the terminal planning-only integration update.

### Evidence and blockers

- Delivery integration branch: `codex/repair-agent-workflow-integration`, initialized from local `main` at `be9c8cf` (the supplied plans). Remote push succeeded; repository grants push/admin access. Implementation PRs land here, preserving individual commits; no promotion, release tagging, or publication is included.
- PR #33 passed baseline reproductions, bounded independent review, scoped documentation harmonization, 110 local tests, and full source-bound CI. Codex completed without findings; all eight CodeRabbit items have accepted dispositions and resolved threads.
- Candidate `codex/validate-agent-workflow-readiness` is included by the second named result. Its declared paid model sample is authorized by the contract's included source; operator approval, tagging, and publication remain excluded.

- Current measurement: source `a25fc90`, production executable SHA-256 `109135f4f60371ba0862c91464c878806883e3e65859fb3220721bcd7e590a59`. Fixed body 3/3, original workflow, and deterministic exact/comparison paths passed. The declared model sample completed: body-agent 2/3 and research 1/6 passed; all outcomes are retained and the report preserves the release hold. Two earlier pre-model selection failures were fixed with fictional regression coverage; neither made paid calls.
