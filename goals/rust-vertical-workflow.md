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

Read the active rewrite plan and CLI transport contract, then implement the first reviewable compatibility-baseline slice without changing the active TypeScript product.

### Evidence and blockers

- Initialization boundary: the temporary `codex/rust-vertical-workflow` integration branch is necessary for the contract's sequential PR lifecycle and terminal metadata commit.
- Remote direct-push preflight for the integration branch succeeded on 2026-08-22.
- The integration base includes commit `795bf59`, which established the accepted rewrite plan and project queue; no implementation work has started.
