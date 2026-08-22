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
- Canonical DART wire authority and discarded Rust feasibility slice — merged
  through PR #20 at `de663c6` after all ten review threads were resolved.

### Current in-scope result

Retained company-search → filing-search → report-viewing candidate through the
Rust SDK, async Node SDK, Clap CLI, forwarding npm launcher, and current-host
native package, followed by vertical acceptance and independent review.

### Next in-scope action

Commit and push the independently reviewed candidate, then deliver the final
implementation PR through its complete review and feedback lifecycle.

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
- At the PR 1 checkpoint, additional fixture-backed vertical success and
  `--agent` scenarios were still intentionally assigned to the later canonical
  wire/candidate slices; they are now present in the candidate profile.
- PR #19 passed repository CI and completed the required review lifecycle with all four review threads resolved and no pending or outside-diff feedback. Its three commits were preserved by merge commit `ff8770c` on 2026-08-22.
- PR 2 authority candidate defines exactly four upstream operations in OpenAPI,
  25 stable HTML/viewer/transport rules, 17 independently fictional fixture
  cases with language-neutral expected outcomes, and 10 exact transport fault
  recipes covering redirects, media type, every deadline phase, and all three
  byte caps. `bun run check:dart-wire` validates
  exact operation triples, schema-conforming serialized requests and coupled
  form invariants, fixture hashes and provenance, CP949-only and malformed-byte
  behavior through every accepted alias, qualification completeness, and the
  authority lock. Fourteen fixture cases conform through the unchanged active
  TypeScript parsers, and nine POST cases exercise the active serializers.
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
- PR #20 received four CodeRabbit and six Codex findings. The review follow-up
  adds successful partial-row cases, an attachment-selected shell case, exact
  nested TOC and document projections, active POST serializer conformance with
  repeated fields, redirect and media-type failures, and distinct connect,
  idle-read, and total deadline recipes. It also hardens missing-request and
  reference-cycle handling, exercises raw OpenAPI references before validation,
  and makes fault-set comparison independent of object key order.
- The review-strengthened authority passes 17 fictional fixture cases and 10
  exact fault recipes. Fourteen cases conform through unchanged active
  TypeScript parsers, and nine POST cases conform through unchanged active
  serializers. Frozen install, wire checks, typecheck, 338 tests with 23 live
  skips, build, all 21 compatibility cases, both mutation sentinels, package
  dry-run, active-TypeScript diff checks, and whitespace checks pass.
- An independent post-fix review classified every PR #20 finding as resolved,
  found no remaining correctness or design issue, and confirmed that no active
  TypeScript, package, lockfile, compatibility-test, or CI file changed.
- PR #20 passed CI and security checks, received explicit CodeRabbit
  confirmation on its fixes, and completed with no pending, unresolved, or
  outside-diff feedback. Its three commits were preserved by merge commit
  `de663c6` on 2026-08-22.
- The retained candidate workspace now compiles on Rust 1.92 with a public
  `DartyClient` exposing only the three included typed async operations. Its
  private transport enforces no redirects, 5/10/30-second deadlines, exact
  forms and viewer replay, 8/16/64 MiB streamed caps, declared HTML media type,
  and UTF-8/WHATWG EUC-KR decoding. Public report identifiers remain opaque,
  and raw viewer locators are not serialized.
- Initial Rust SDK review found six correctness gaps: provider pacing and
  concurrency, cyclic/deep TOC safety, shell locator validation, raw locator
  leakage through typed errors, permissive viewer-receipt URLs, and missing
  post-refetch document-selection confirmation. The candidate now serializes
  each client's requests with at least 250 milliseconds between starts,
  validates bounded locator graphs and identities before replay, publishes
  endpoint-only error URLs, accepts only canonical receipt URL fields, and
  rejects an unconfirmed document selection. Focused re-review found that the
  first confirmation still trusted a regenerated positional ID; the follow-up
  now also preserves and compares the requested upstream document identity.
- Rust SDK validation passes formatting, Clippy with warnings denied, 14 unit
  tests, and 11 public fixture tests. The fixture tests exercise exact
  company/report forms and shell/content queries, the four-step workflow,
  normalized empty and partial results, advanced filters, concise projection,
  section navigation, no-TOC MS949 content, rejected non-DART viewer URLs, and
  classified 503, redirect, media-type, charset, and streamed-size failures.
  Adversarial tests now also cover cyclic and over-deep TOCs, locator/receipt
  drift, strict document queries, first-valid initial locator selection,
  endpoint-only content errors, ignored and same-position/different-identity
  document reselection, serialized requests, 250-millisecond pacing, and a
  cancelled queued waiter.
- The retained adapter boundary is now complete. `darty-cli` exposes only the
  three included Clap commands, `darty-node` retains one shared Rust client per
  JavaScript `DartyClient`, and the public ESM facade exposes exactly three
  Promise-returning methods plus typed `DartyError` failures and AbortSignal
  cancellation. The binding converts panics to typed internal errors and keeps
  its generated unsafe-code exception isolated to the Node-API crate.
- The unpublished candidate npm root contains only the asynchronous SDK facade
  and forwarding launcher. Its darwin-arm64 optional package contains the Rust
  CLI and Node-API addon during disposable staging; both packages include the
  project license. Clean-consumer acceptance verifies exact packed contents,
  TypeScript declarations, the real addon, typed failures, prompt cancellation,
  shared provider pacing, launcher stdout/stderr/arguments/exit forwarding, and
  absence of JavaScript-owned command semantics.
- The compatibility corpus now has a separate `candidate` profile. It preserves
  the 12 frozen vertical help/validation cases and adds five independently
  reviewed, fixture-backed exact success goldens covering company output,
  company and filing agent projections, bounded TOC, and a truncated section
  content window. All 17 cases pass against the Rust executable; the unchanged
  active TypeScript product still passes the original 21-case full profile and
  both transport-version mutation sentinels.
- Rust 1.88 validation passes workspace formatting, all 26 tests (14 SDK unit,
  11 public integration, one Node panic-containment), Clippy with warnings
  denied, warning-free documentation, locked release builds, RustSec advisory
  audit, and explicit cargo-deny advisory/bans/license/source policy. The
  active baseline still passes frozen install, wire authority checks,
  typecheck, 338 tests with 23 live skips, build, full compatibility, mutation,
  and npm package dry-run. `src/`, root `package.json`, `bun.lock`, and GitHub
  workflow files have no diff.
- Independent final review found an immediate AbortSignal registration race, a
  hand-maintained and inaccurate public error declaration, and permissive
  candidate-fixture matching. The Node facade now registers cancellation
  synchronously before execution, rechecks the signal after listener
  attachment, and passes an abort-at-once packaged regression. One typed
  `index.ts` now generates both runtime JavaScript and declarations; acceptance
  checks their byte-for-byte freshness and the public `DartyError` constructor.
  Fixture selection now compares complete query and body maps for every method,
  with regressions for unexpected POST queries and GET bodies. Targeted Rust
  tests, Clippy, and clean packaged-consumer validation pass after the fixes.
- Focused independent re-review found no actionable issue after those fixes.
  Final validation passes on Rust 1.88: formatting, 26 workspace tests, Clippy,
  warning-free docs, locked release builds, RustSec audit, and cargo-deny policy.
  Clean package acceptance and all 17 candidate judge cases pass. The unchanged
  active TypeScript product passes frozen install, wire checks, typecheck, all
  338 tests with 23 live skips, build, all 21 frozen CLI cases, both mutation
  sentinels, and npm package dry-run.
