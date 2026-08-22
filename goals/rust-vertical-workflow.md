# Goal: Deliver the Rust vertical workflow candidate

Status: active
Planning scope: ROADMAP.md

## Original contract

Goal contract

- Outcome: Deliver the reviewed company-search → filing-search → report-viewing candidate through the Rust SDK, Node SDK, and Rust CLI while the active TypeScript product remains unchanged.
- Goal state: goals/rust-vertical-workflow\.md
- Included results and sources (semantic results define scope; paths supply detail):
  - Recoverable compatibility baseline and mutation-tested parity judge — plans/rust-sdk-node-sdk-cli-rewrite.md; docs/specs/cli-transport-v1.md
  - Canonical DART wire authority and discarded Rust feasibility slice — plans/rust-sdk-node-sdk-cli-rewrite.md; docs/research/dart-source-map.md
  - Three-operation Rust SDK workflow — plans/rust-sdk-node-sdk-cli-rewrite.md; docs/specs/dsae001-search-company-v1.md; docs/specs/dsab007-search-company-reports-v1.md; docs/specs/dsaf001-view-report-v1.md
  - Async Node SDK candidate — plans/rust-sdk-node-sdk-cli-rewrite.md
  - Clap CLI, forwarding npm launcher, and current-host native package — plans/rust-sdk-node-sdk-cli-rewrite.md; docs/specs/cli-transport-v1.md
  - Vertical acceptance, independent review, and unchanged active TypeScript baseline — plans/rust-sdk-node-sdk-cli-rewrite.md
- Complete when: Every included result achieves its cited outcome and applicable completion criteria within its named semantic boundary; repository-required validation and review pass; planning is truthful; Delivery finishes.
- Excluded: Porting the remaining five operations to complete candidate parity; Pi adapters, MCP servers, browser automation, and other runtime-specific toolsets.
- Authority: Execute only included results and necessary supporting work; record anything else and ask before scope expansion or external authority.
- Resume: Initialize this contract with $progress goal mode before work; recover it before every resume, continuation, compaction, or handoff; stop if recovery fails.
- Delivery: PR delivery — use $progress's PR lifecycle and the fewest sequential reviewable PRs; finish each through $create-pr and $address-pr-feedback before starting the next, including the final implementation slice.

## Authorized amendments

_None._

## Execution status

### Completed included results

_None._

### Current in-scope result

Recoverable compatibility baseline and mutation-tested parity judge.

### Next in-scope action

Commit and deliver the independently reviewed compatibility-baseline slice through PR feedback completion before starting source authority.

### Evidence and blockers

- Initialization boundary: the temporary `codex/rust-vertical-workflow` integration branch is necessary for the contract's sequential PR lifecycle and terminal metadata commit.
- Remote direct-push preflight for the integration branch succeeded on 2026-08-22.
- The integration base includes commit `795bf59`, which established the accepted rewrite plan and project queue; no Rust implementation work has started.
- PR 1 candidate adds a 21-scenario process-isolated CLI v1 corpus, full and vertical profiles, and a disposable-bundle mutation proof without editing `src/` or changing active package exports or `bin`.
- Baseline reconciliation records the three implemented vertical contracts, compatibility aliases and quirks, empty-result differences, opaque viewer locators, and evidence classifications.
- Untouched TypeScript baseline validation at dispatch: typecheck, 338 tests passed with 23 live skips, npm CLI build, and npm pack dry-run succeeded.
- PR 1 candidate validation: typecheck passed; 338 tests passed with 23 opt-in live skips; all 21 full-profile CLI scenarios passed; the disposable transport-version mutant was rejected at the expected JSON path; and the live four-step company → filing → TOC → section workflow passed on 2026-08-22.
- Independent review completed on 2026-08-22. Its two safe findings were applied by asserting every vertical help option and adding deterministic pretty-success coverage; targeted parity, mutation, package dry-run, and diff checks passed afterward.
- Fixture-backed vertical success and `--agent` scenarios remain intentionally assigned to canonical wire authority, and must join the judge before candidate acceptance.
