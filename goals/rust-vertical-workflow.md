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

- Recoverable compatibility baseline and mutation-tested parity judge — merged
  through PR #19 at `ff8770c`; locally marked by the annotated non-release tag
  `archive/rust-rewrite-baseline`.

### Current in-scope result

Canonical DART wire authority and discarded Rust feasibility slice.

### Next in-scope action

Deliver the canonical authority and discarded feasibility evidence through the
PR 2 review lifecycle. Do not start the retained candidate until PR 2 is merged.

### Evidence and blockers

- Initialization boundary: the temporary `codex/rust-vertical-workflow` integration branch is necessary for the contract's sequential PR lifecycle and terminal metadata commit.
- Remote direct-push preflight for the integration branch succeeded on 2026-08-22.
- At initialization, the integration base included commit `795bf59`, which
  established the accepted rewrite plan and project queue; no retained Rust
  candidate implementation had started.
- PR 1 candidate adds a 21-scenario process-isolated CLI v1 corpus: 9 scenarios are tagged `full`, 12 are tagged `vertical`, the full judge runs all 21, and the vertical judge runs the 12 vertical scenarios. It also adds a disposable-bundle mutation proof without editing `src/` or changing active package exports or `bin`.
- Baseline reconciliation records the three implemented vertical contracts, compatibility aliases and quirks, empty-result differences, opaque viewer locators, and evidence classifications.
- Untouched TypeScript baseline validation at dispatch: typecheck, 338 tests passed with 23 live skips, npm CLI build, and npm pack dry-run succeeded.
- PR 1 candidate validation: typecheck passed; 338 tests passed with 23 opt-in live skips; all 21 full-profile CLI scenarios passed; the disposable transport-version mutant was rejected at the expected JSON path; and the live four-step company → filing → TOC → section workflow passed on 2026-08-22.
- Independent review completed on 2026-08-22. Its two safe findings were applied by asserting every vertical help option and adding deterministic pretty-success coverage; targeted parity, mutation, package dry-run, and diff checks passed afterward.
- PR feedback tightened help parity to exact option sets plus normalized semantic copy, clarified the company-detail locator, and pinned the new Node action. CI exposed pre-existing `.js`/ESM mismatches in temporary smoke and mutation artifacts at the declared Node 20 minimum; naming both artifacts `.mjs` restored all 338 tests and the mutation proof under Node 20.18.1. The proof now forwards `process.execPath`, so its subject uses the same runtime as the proof itself.
- Additional fixture-backed vertical success and `--agent` scenarios are not yet in the manifest. They remain intentionally assigned to canonical wire authority and must join the judge before candidate acceptance.
- PR #19 passed repository CI and completed the required review lifecycle with all four review threads resolved and no pending or outside-diff feedback. Its three commits were preserved by merge commit `ff8770c` on 2026-08-22.
- PR 2 authority candidate defines exactly four upstream operations in OpenAPI,
  25 stable HTML/viewer/transport rules, 14 independently fictional fixture
  cases with language-neutral expected outcomes, and 6 exact transport fault
  recipes covering all three byte caps. `bun run check:dart-wire` validates
  exact operation triples, schema-conforming serialized requests and coupled
  form invariants, fixture hashes and provenance, CP949-only and malformed-byte
  behavior through every accepted alias, qualification completeness, and the
  authority lock. Eleven fixture cases also conform through the unchanged
  active TypeScript parsers.
- Five bounded metadata-only live probes on 2026-08-22 returned HTTP 200 without
  authentication or redirects: company search (7,315 bytes), filing search
  (18,514), report shell (71,132), UTF-8 section (4,753), and MS949 no-TOC
  content (47,703). No live body was retained.
- Independent PR 2 review found and prompted fixes for retryability ownership,
  exact operation enumeration, serialized request constraints, typed fixture
  expectations, all byte-limit boundaries, CP949-extension and malformed-byte
  decoding, unsupported-charset rejection, viewer selection fallback, and a
  stale research link. Focused re-review found no remaining actionable issues.
  Authority/conformance,
  frozen install, typecheck, all 338 tests (23 live skips), build, all 21 CLI
  judge cases, mutation proof, package dry-run, and diff checks pass.
- The canonical authority was committed and pushed as `8e7b30b` after two
  focused re-reviews reported no remaining actionable findings.
- A private disposable Rust crate outside the repository proved the exact
  four-request handoff, three parser boundaries, UTF-8/CP949/malformed decoding,
  redirect/status/type/charset failures, all three streamed byte caps, total
  and idle deadline classifications, and cancellation selection. Its request
  assertions covered the representative default workflow, not the complete
  OpenAPI form surface. Rust format, Clippy with
  warnings denied, and five locked integration tests passed on Rust/Cargo
  1.92.0 for `aarch64-apple-darwin`.
- The feasibility crate, lockfile, source, and build directory were deleted.
  Repository absence checks found no `.rs`, `Cargo.toml`, `Cargo.lock`, or
  `target`, and `src`, `package.json`, and `test/compat` remained unchanged.
  Only [`docs/research/rust-feasibility-v1.md`](../docs/research/rust-feasibility-v1.md)
  retains the evidence and candidate implications.
- Final independent feasibility review narrowed request-serialization claims
  to the representative default workflow, required numeric timeout and
  cancellation configurations plus their measurement limits, and corrected
  the initialization wording. Re-review found no remaining actionable issue.
