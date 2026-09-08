# Goal: Finish the Rust rewrite

Status: active
Planning scope: ROADMAP.md

## Original contract

Goal contract

- Outcome: Finish Darty’s repository rewrite with all eight operations shared by the Rust SDK, Node SDK, and standalone CLI, removing the superseded TypeScript implementation.
- Goal state: goals/finish-rust-rewrite.md
- Included results and sources (semantic results define scope; paths supply detail):
  - Full capability parity and refreshed source evidence — /Users/sejunpark/IT/darty/plans/rust-sdk-node-sdk-cli-rewrite.md, Phase 3.
  - Validated SDK/CLI artifacts, atomic repository cutover, documentation reconciliation, and release handoff — /Users/sejunpark/IT/darty/plans/rust-sdk-node-sdk-cli-rewrite.md, Phase 4; /Users/sejunpark/IT/darty/docs/release.md.
- Complete when: Every included result achieves its cited outcome and applicable completion criteria within its named semantic boundary; repository-required validation and review pass; planning is truthful; Delivery finishes.
- Excluded: Rust release signoff and publication, including release tags, paid model evals, and human production approval.
- Authority: Execute only included results and necessary supporting work; resolve remaining decisions within that closed outcome using best judgment; record anything else and ask before scope expansion or external actions not covered by this contract and Delivery.
- Resume: Initialize this contract with $progress goal mode before work; recover it before every resume, continuation, compaction, or handoff; stop if recovery fails.
- Delivery: PR delivery — use $progress's PR lifecycle and the fewest sequential reviewable PRs; finish each through $create-pr and $address-pr-feedback before starting the next, including the final implementation slice.

## Authorized amendments

_None._

## Execution status

### Completed included results

_None._

### Current in-scope result

Phase 3 — full capability parity and refreshed source evidence.

### Next in-scope action

Reproduce viewer drift, reconcile contracts, and implement full eight-operation parity across the Rust SDK, Node SDK, and CLI before Phase 4 cutover.

### Evidence and blockers

- Initialization: published baseline is v0.6.0 TypeScript; Rust candidate implements three vertical operations.
- Delivery integration branch: `codex/finish-rust-rewrite-integration`; direct push preflight succeeded. Sequential slice PRs merge here with individual commits preserved; terminal metadata is committed directly here after final delivery.
- Existing uncommitted planning changes in architecture, roadmap, release runbook, rewrite plan, and standalone plan predate this run and are preserved for reconciliation.
- Boundary classification: Phase 3 parity is included; integration branch and durable contract initialization are necessary for Delivery. Release tags, publication, paid evals, and human production signoff remain excluded.

