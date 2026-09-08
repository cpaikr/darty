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

Finish PR #27 feedback validation and merge it into the rewrite integration branch before Phase 4 artifact validation and cutover.

### Evidence and blockers

- Initialization: published baseline is v0.6.0 TypeScript; Rust candidate implements three vertical operations.
- Delivery integration branch: `codex/finish-rust-rewrite-integration`; direct push preflight succeeded. Sequential slice PRs merge here with individual commits preserved; terminal metadata is committed directly here after final delivery.
- Existing uncommitted planning changes in architecture, roadmap, release runbook, rewrite plan, and standalone plan predate this run and are preserved for reconciliation.
- Boundary classification: Phase 3 parity is included; integration branch and durable contract initialization are necessary for Delivery. Release tags, publication, paid evals, and human production signoff remain excluded.


- Phase 3 implementation in progress on `codex/rust-full-parity`: all eight Rust SDK and Node/CLI adapters implemented; TypeScript baseline retained.
- Viewer drift reproduced: DART rebinds one JavaScript variable to four fresh TOC objects. Rust now preserves object identity; independently fictional fixture covers rebinding. Regex/no-TOC and graph-bound acceptance rules reconciled in the canonical companion.
- Independent SDK review found strict-date and whitespace-normalization defects; both corrected with regression tests. Initial workspace validation passed 49 SDK unit tests, 20 integration tests, 9 CLI tests and Node panic containment; additional transport cases are in progress.
- Independent parity corpus: 19 body/detail/RSS cases pass Rust request/result checks. Expanded CLI full judge covers baseline-derived network projections. A baseline Effect error-wrapping bug is explicitly dispositioned: recognized missing company is `not_found` in Rust.
- Phase 3 validation: 50 SDK unit tests, 22 integration tests, 9 CLI tests, Node panic containment, workspace Clippy and rustdoc pass. Rust and retained TypeScript each pass 51 full CLI scenarios, with the missing-company baseline defect explicitly dispositioned.
- Packaged Node consumers pass all eight operations, public declarations, validation, pre-abort and in-flight cancellation for new network operations. Wire authority passes 7 operations, 43 rules, 37 fictional cases and 10 shared fault recipes.
- Bounded 2026-09-08 release CLI live refresh succeeds across all six source-backed operations, including repaired four-root TOC and section content; provider record retains pending human approval. No live response bodies retained.
- Bounded SDK, CLI/Node, and integration reviews completed. Fixed strict input handling, body error hints, and baseline/standalone judge integration findings. Scoped documentation reconciliation completed. TypeScript installed archive passes 36 network-free process scenarios; release checks and mutation proof pass.
- PR [#27](https://github.com/cpaikr/darty/pull/27) targets the rewrite integration branch at initial head `93c34b6`. Linux CI passed, including Rust 1.88 and installed Linux x64 archive certification. CodeRabbit and Codex completed their initial reviews; no manual retriggers.
- Feedback fixes preserve field-specific Node validation, implement help aliases and bounded debug diagnostics, honor pretty unknown-command failures, correct all-dropped-page guidance, and enforce declared fixture assertions. Strict stock-code parsing and observed viewer provenance are retained with source evidence. Bounded follow-up review passed; packaged-consumer validation passed, including field-specific production validation, all help aliases, pretty errors, and bounded debug diagnostics. Push, replies, and merge remain. No publication or approval records created.
