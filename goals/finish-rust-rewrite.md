# Goal: Finish the Rust rewrite

Status: complete
Planning scope: ROADMAP.md

Historical completed goal. The contract and execution evidence below describe
the 2026-09-08 delivery boundary. Rust v0.6.1 was subsequently published;
[the rewrite record](../plans/rust-sdk-node-sdk-cli-rewrite.md) distinguishes
that later event, and [the release runbook](../docs/release.md) owns current
approvals and distribution. References to removed files or original local paths
inside the contract are retained as historical scope evidence.

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

- Phase 3: all eight operations shared by Rust SDK, Node SDK, and CLI, with refreshed source evidence; PR #27 merged as `3c4ba7e`.
- Phase 4: validated SDK/CLI artifacts, Rust runtime cutover, complete superseded-source removal, documentation reconciliation, and operator release handoff; PR #29 merged as `4b70251`, PR #30 as `fb31a04`.
- Delivery destination: `codex/finish-rust-rewrite-integration`. Individual implementation and feedback commits are preserved. Terminal goal and planning metadata is committed directly on that branch.

### Current in-scope result

None — all included results complete.

### Next in-scope action

None — goal complete.

### Evidence and blockers

- Both initial CodeRabbit and Codex reviews completed for each delivered PR. All actionable feedback has a disposition; no unresolved threads remain. Oversized PR #28 is closed and retained as the superseded aggregate. Replacement PRs changed 144 and 148 files without local review exclusions.
- Final implementation `064f580` passes [CI 34190295828](https://github.com/cpaikr/darty/actions/runs/34190295828): workspace validation/audits, 62 harness tests, 64 CLI compatibility scenarios, SDK consumers and declarations, four cross-builds, both Linux CLI archive certifications, and source-bound SDK/bundle assembly. Earlier [build-only run 34183249366](https://github.com/cpaikr/darty/actions/runs/34183249366) validates the explicit release workflow without tags or publication. Local exact macOS artifacts passed Node consumption, 36 installed CLI process scenarios, and the live company→filings→TOC→section workflow.
- Feedback fixes preserve field-specific Node errors, CLI numeric option attribution and content-offset syntax, complete eval JSON, and clean crate provenance. Independent bounded code reviews and scoped documentation reconciliation pass.
- [Provider evidence](../docs/research/dart-provider-qualification.md) records the bounded 2026-09-08 refresh for all six source-backed operations, including the repaired viewer object-identity grammar. Static disclosure types and report guide are covered independently. Human production approval remains pending.
- [Release handoff](../docs/release.md#release-approvals) assigns separate production signoff, paid-model evals, source tags, and publication to the release operator. Published v0.6.0 remains TypeScript; Rust v0.6.1 is unpublished. Promotion to main was not part of this delivery.
- AXI local-evidence paths now point to Rust. The unchanged upstream baseline reports pre-existing drift (`46d02d3`→`9996613`, 16 commits), recorded for separate review; it is not a cutover regression or an unfinished included result.
- No in-scope blocker remains. The roadmap's Current entry is empty; completing this goal does not start excluded release or backlog work.
