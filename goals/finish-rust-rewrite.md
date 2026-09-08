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

- 2026-09-08: The user directed: “If this is a promotional commit i dont need coderabbit reviews. If not, split pr based on commits so each pr is small enough for coderabbit to review.” PR #28 contains substantive packaging, CI, and runtime changes, so split its oversized implementation commit into two sequential reviewed PRs. The first switches all executable/product paths to Rust and retires TypeScript entry points/tests; the second deletes the remaining inactive source. This changes the review partition, permits that bounded intermediate state, and authorizes initial reviews for the replacement PRs. Final scope, integration destination, and release exclusions are unchanged. Pure promotion PRs are exempt from CodeRabbit; none is part of this delivery.

## Execution status

### Completed included results

Phase 3 — full capability parity and refreshed source evidence; PR #27 merged into the integration branch as `3c4ba7e`.

### Current in-scope result

Phase 4 — artifacts and atomic repository cutover.

### Next in-scope action

Deliver the final inactive-source deletion PR, including initial CodeRabbit/Codex review and exact-head CI, into the rewrite integration branch; then commit terminal planning metadata there.

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
- Feedback fixes preserve field-specific Node validation, implement help aliases and bounded debug diagnostics, honor pretty unknown-command failures, correct all-dropped-page guidance, and enforce declared fixture assertions. Strict stock-code parsing and observed viewer provenance are retained with source evidence. Bounded follow-up review passed; packaged-consumer validation passed, including field-specific production validation, all help aliases, pretty errors, and bounded debug diagnostics. Fix commit `dc4faa2` passed exact-commit CI run `34179554970`; all 13 threads are replied/resolved, and CodeRabbit accepted the fixes and withdrew both evidence-based findings. PR #27 merged as `3c4ba7e`. No publication or approval records created.

- Phase 4 started on `codex/rust-artifact-cutover` from integration tip `3c4ba7e`. Existing candidate Node consumers have only demonstrated macOS ARM64; Linux CI currently tests Rust source, not packaged Node. Preserve this distinction until clean Linux consumers pass.

- Phase 4 selected one private artifact line at v0.6.1: standalone Rust CLI on the existing four targets, Rust SDK crate, Node tarballs containing native addons for Linux GNU x64 and macOS ARM64. Rust 1.88, Node 22.12 minimum, GNU glibc 2.28. Linux-only CI policy retained; non-Linux cross-builds do not claim runtime certification.
- Atomic cutover removes the TypeScript DART implementation, obsolete npm CLI launcher, migration-only conformer, and unused dependencies. Eval subprocesses now execute Rust; the wire lock binds the Rust integration conformer.
- Local Phase 4 checks pass: 64 full CLI scenarios and mutation proof; 59 Bun harness/release/process tests; Rust workspace tests, Clippy, rustdoc, release panic containment, audit/deny; wire authority and typecheck; clean Rust crate consumer; packaged Node types, all operations, cancellation, and production-hook rejection. macOS exact CLI archive passes 36 network-free installed process scenarios and the live company→filings→TOC→section workflow. macOS native tarball passes a clean offline consumer.
- Bounded artifact review and final cutover code review completed. Fixed addon format/architecture/type validation and documented concrete SDK installation/version contracts. Scoped documentation reconciliation completed; local links and documented commands validate. Linux build-only CI and the final sequential PR remain pending. Candidate final PR is included by Phase 4 and necessary for Delivery; no release tag or publication is authorized.

- PR #28 is open at initial head `2196e50`. Initial build-only run `34181869781` passed shared Linux validation before the macOS linker failure documented below; publication was skipped. Codex completed its initial review with no findings (PR-body +1 by the connector at 2026-09-08T03:07:10Z).
- CodeRabbit refused its initial manual review because 284 files exceeded the 150-file limit. Added inherited path filters for only the 207 fully deleted `src/` and `candidate/` paths, leaving 80 review files including the configuration. Central automatic-review settings remain unchanged; official schema and bounded review pass. A second manual request requires an explicit exception to the one-trigger policy; it has not been sent.

- Build-only run `34181869781` passed Linux x64/ARM64 and Windows x64 builds, but macOS Node linking failed because cargo-zigbuild 0.23.4 rewrites Rust’s exported-symbol-list operand. Pinned only macOS to the official 0.23.3 amd64 image digest; upstream source diagnosis and bounded review agree. Subsequent cross-build and consumer results are recorded below.

- Exact implementation head `f38654b` passes CI `34183234459` and build-only run `34183249366`: four cross-builds, both Linux CLI archive certifications, clean Linux Node/Rust consumers, and bundle assembly. Downloaded checksums, seven artifact hashes, and source identity verify. The exact cross-built macOS Node tarball passes a clean local consumer; the CLI archive passes 36 process scenarios and the live company→filings→TOC→section workflow. Publication was skipped.
- Superseded PR #28 at `6ea86a7` passes full CI `34184415484`; Codex completed with no findings, but CodeRabbit rejected the initial oversized diff before review. Preserve that branch as the verified aggregate. The user selected smaller replacement PRs instead of a filtered retry; `.coderabbit.yaml` exclusions are omitted. No retry, source tag, publication, or production approval was performed.
- Review partition: first commit contains the Rust runtime/artifact cutover, all retired TypeScript tests and entry points (144 files); the second removes the 142 remaining inactive source files and reconciles status/evidence references, staying below 150 files. Both land sequentially into `codex/finish-rust-rewrite-integration`; source deletion completes before goal completion.

- PR #29 merged as `4b70251` after Codex completed without findings, CodeRabbit accepted five feedback fixes and withdrew optional caching, and exact-head CI `34188505683` passed. Fix commits: `429ce3c`, `a0bde95`, `4307152`. All six threads resolved. Local validation passes 62 Bun tests, 64 CLI compatibility scenarios, CLI tests/Clippy, typecheck, and clean Rust crate packaging plus external consumption.
- Final slice removes the 142 remaining inactive TypeScript source files and replaces two AXI local-evidence paths with the Rust CLI. No runtime code changes; review and exact-head CI remain before final merge and terminal completion metadata.
- Final-slice local checks: typecheck, 62 Bun tests, wire authority, bounded deletion review, and local evidence/link validation pass. `check:axi` reaches the upstream comparison but reports pre-existing drift (pinned `46d02d3`, current `9996613`, 16 commits); the upstream baseline and observation date are unchanged. Upstream AXI drift review remains separate from the Rust cutover.
- PR #30 initial Codex review completed without findings; CodeRabbit's two documentation findings are addressed by narrowing the removed-test wording and clarifying that the Plans section has no additional queued plans. Current retains the single active-plan link. Updated-head CI remains before merge.
