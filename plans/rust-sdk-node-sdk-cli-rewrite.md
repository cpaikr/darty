# Complete the Rust SDK, Node SDK, and CLI rewrite

## Outcome

Complete the repository replacement with one Rust-owned implementation of all
eight accepted operations, exposed through the Rust SDK, asynchronous Node SDK,
and standalone `darty` CLI. Preserve CLI v1 behavior, replace the TypeScript
executable in the existing private GitHub Release pipeline, and remove the
superseded TypeScript DART implementation and source-local toolset.

Repository completion means reviewed source, validated distributables, and a
working build-only delivery path. Publishing the Rust release, paid model evals,
and human production approval are separate release gates; this plan does not
claim they have happened.

## Current state

The published v0.6.0 CLI is Bun/TypeScript. Phase 3 completed through
[PR #27](https://github.com/cpaikr/darty/pull/27), merged into the rewrite
integration branch as `3c4ba7e`. All eight operations have Rust, Node, and CLI
parity, fictional wire evidence, consumer checks, and explicit compatibility
dispositions. Bounded live refresh on 2026-09-08 passed all six source-backed
operations, including the repaired viewer; the
[provider record](../docs/research/dart-provider-qualification.md) owns evidence
and pending human approval.

Phase 4 technical validation is complete at `f38654b`: CI and build-only run
[34183249366](https://github.com/cpaikr/darty/actions/runs/34183249366) pass all
four cross-builds, both Linux installed CLI archives, clean Linux Rust/Node
consumers, and bundle assembly. Downloaded artifact hashes and source identity
verify; the exact macOS artifacts also pass local Node consumption and installed
CLI process/live checks. Bounded code review and documentation reconciliation
are complete for the aggregate change. The runtime/artifact replacement
[PR #29](https://github.com/cpaikr/darty/pull/29) merged as `4b70251` after
both initial reviews, feedback fixes, and exact-head
[CI 34188505683](https://github.com/cpaikr/darty/actions/runs/34188505683) passed.
The fixes preserve complete eval output, normalize numeric CLI errors, reject
dirty crate packaging, and align release instructions with certification.

The user requested smaller commit-based PRs after
[PR #28](https://github.com/cpaikr/darty/pull/28) exceeded CodeRabbit’s 150-file
limit. The final slice removes all 142 inactive TypeScript source files and
updates AXI evidence to the Rust CLI. Its initial reviews and exact-head CI
remain before merge into the rewrite integration branch and repository
completion. Rust v0.6.1 remains unpublished.
[Architecture](../ARCHITECTURE.md) owns topology and
[release.md](../docs/release.md) owns artifact contracts and the operator handoff.

## Decisions and authority

- Preserve the eight operation names, read-only/reference-first behavior, and
  [CLI v1 contract](../docs/specs/cli-transport-v1.md), including output, errors,
  help, and exits. Do not turn this rewrite into CLI v2.
- Rust owns requests, transport policy, bounds, decoding, parsing, normalization,
  and source failures. The asynchronous Node-API binding and TypeScript facade
  translate runtime concerns; the separate Rust CLI adapts the SDK to subprocess
  use. Neither adapter owns another DART implementation.
- Keep TypeScript runnable as the comparison baseline until full parity and
  artifact evidence permit the runtime cutover with a normal Git revert path.
  The user-authorized review split retains inactive source only until the
  immediately following deletion PR; no second runtime path remains.
  Preserve independent contract tests after deleting migration-only machinery.
- On 2026-09-08 the owner delegated remaining SDK packaging, platform details,
  and technical repository-cutover decisions within this outcome. Resolve them
  using evidence and record the selected contracts in their canonical documents.
  Publication, paid model use, and human production approval remain outside this
  delegation. Do not attribute an agent's technical review to a human approver.
- Preserve private GitHub Releases as the artifact authority, runtime-independent
  CLI installation, and Linux-only CI. Preserve the existing CLI target inventory;
  select and verify the Node SDK projection without assuming the old npm launcher
  or npm registry publication is required. CLI installation must not load Node.
- Port and review coherent results through the fewest sequential PRs. Branch
  pushes, review, and merges belong to that delivery lifecycle; release tags and
  publication do not. A PR boundary is not the end of the rewrite.

### Preference reconciliation

Reviewed `../mytech` at `9824182d0c21e084a1e8a7725f962db0d3417a2a`
(2026-09-07). Its [rewrite guidance](../../mytech/practices/code-rewrites.md)
and [Rust core guidance](../../mytech/architecture/external-http/rust-for-external-http-protocols.md)
now require concrete consumer or operating benefits, not a language preference.
The accepted Darty target shares semantics across the Rust SDK, Node SDK, and
native CLI; there is no claimed performance win, and standalone installation is
already achieved by TypeScript. Keep the replacement limited to that target.

Follow the [Node binding guidance](../../mytech/architecture/rust-cores-for-nodejs-packages.md)
for resource lifetime, cancellation, generated declarations, and panic containment
under the actual release panic strategy. Darty's owner-selected Linux-only policy
in [release.md](../docs/release.md#targets-and-verification) remains an intentional
override of mytech's full-platform runtime verification default. Distinguish
cross-built targets from runtime-certified targets in artifacts and documentation.

## Phase 3 — full capability and SDK parity

### Repair existing evidence first

Reproduce the recorded `view-report` failure for receipt `20260331000460` through
the user-facing workflow with bounded, sanitized runtime evidence. Reconcile the
current source grammar, contract, and fictional fixtures before choosing a fix.
Also settle TS/Rust differences for regex literals, explicit no-TOC initialization,
and tree bounds. Bring bounds into the canonical contract with independent
coverage or remove unsupported candidate-only limits; do not silently loosen
source validation to obtain parity.

### Complete the remaining operations

Port `search-body`, `company-detail`, `company-rss`, `disclosure-types`, and
`report-guide`. Select their order from dependencies and evidence readiness.
Each operation is complete only when:

- its [capability contract](../docs/specs/README.md), supported wire behavior,
  and independent fixtures are reviewed before the implementation depends on them;
- the Rust SDK, Node SDK, and CLI preserve validation, identifiers, references,
  warnings, typed failures, recovery hints, projections, and content bounds;
- applicable deterministic SDK, full CLI compatibility, malformed/oversized input,
  timeout, cancellation, sanitization, and packaged-consumer checks pass; and
- source-backed operations have refreshed bounded observations and reviewed
  conformance evidence, with drift resolved or an explicit blocking disposition.

For live work, use the fixed origin, pacing, attempt/time/byte limits, sanitization,
and in-memory-only body policy in the
[provider record](../docs/research/dart-provider-qualification.md). Static
`disclosure-types` and `report-guide` need no live provider qualification.
Do not invent human approval records or label pending production approval as
completed qualification. Missing human signoff does not block technical porting;
unresolved source behavior does block claiming parity.

Phase 3 exits when all eight operations work through all three candidate surfaces,
with independent compatibility and consumer evidence. TypeScript entry points
remain intact until Phase 4.

## Phase 4 — artifacts and repository cutover

- Implement the chosen Rust CLI and Node SDK artifact/installation contracts.
  Keep one version/source authority and private release line, checksums, immutable
  tags/assets, and explicit failure recovery. Reuse the existing release pipeline;
  remove the obsolete candidate npm CLI launcher rather than creating two CLI
  installation paths. Specify Rust SDK consumption and version compatibility too.
- Cross-build the existing CLI targets on Linux. Certify exact Linux archives
  through clean installed CLI consumers; verify macOS/Windows binary format and
  architecture and retain their explicit lack of runtime certification. Choose
  the Node target matrix from actual consumer needs and demonstrated evidence;
  do not imply native-addon support from CLI cross-build success.
- Test Rust and Node SDKs as clean external consumers, including loading, public
  types/declaration freshness, async errors, cancellation, cleanup, and panic
  containment under the release build strategy. Verify artifact contents,
  dependency/license policy, version identity, and absence of secrets.
- Exercise the full CLI judge and representative live workflows against the Rust
  executable and installed archive. Adapt existing eval runners away from deleted
  TypeScript entry points; preserve the separate manual hosted-model gate.
- Verify a build-only CI candidate without a source tag, including source-bound
  archives, checksums, installers, and clean consumers. Temporary artifacts prove
  repository readiness, not a published release.
- Replace TypeScript entry points and release build paths with Rust together.
  Deliver that commit and the remaining inactive-source deletion as two
  sequential PRs below the review file limit. Remove the old DART conformer,
  toolset, superseded build/test paths, candidate-only packaging, and unused
  dependencies before repository completion. Keep the thin Node
  facade and independent acceptance corpus; TypeScript as an adapter is not a
  second DART implementation.
- Update instructions, README, architecture, release docs, specs, eval docs,
  commands, and CI together. Distinguish the new repository implementation from
  the previously published TypeScript release until Rust is actually published.

Phase 4 exits when all named results pass applicable checks and independent
review, one Rust implementation owns all eight operations, supported consumers
use the validated artifacts, superseded paths are removed, and the remaining
release gates have an explicit owner and evidence handoff. Repository completion
must not claim release-readiness signoff or publication while those gates remain.

## Separate release gates

The release operator must obtain named maintainer production/qualification
approval against immutable evidence in the
[provider record](../docs/research/dart-provider-qualification.md#maintainer-approval-records),
run authorized paid model evals under the [eval gate policy](../evals/README.md#gate-policy),
and complete exact-source tagging, publication, and published-asset installation
verification under [release.md](../docs/release.md). Prepare the handoff in that
runbook at cutover, preserving all outstanding gates. Never substitute test
success or technical decision delegation for human approval or paid-use authority.

## Out of scope

Rust release signoff and publication follow repository completion, including
Phase 3 parity and Phase 4 artifact validation and cutover.
XBRL, industry discovery, expanded held-out workflows, new content pagination,
and other backlog capabilities remain outside this rewrite; [ROADMAP.md](../ROADMAP.md)
owns their scheduling.

## Next action

Review, validate, and merge the final inactive-source deletion PR into the
rewrite integration branch, then record repository completion.
Stop after repository completion and hand off separate release gates without
starting them.
