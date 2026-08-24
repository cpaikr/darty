# Rust SDK, Node SDK, and CLI rewrite

## Outcome

Darty has one Rust-owned implementation of all eight accepted operations,
exposed through an idiomatic Rust SDK, an asynchronous Node SDK, and a separate
Rust `darty` CLI. The root npm package exports the Node SDK and forwards its
`bin` to platform-native artifacts. The superseded TypeScript conformer and
`@sjunepark/darty/toolset` are removed in one atomic cutover.

## Current state

Phase 3 is active. The Bun/TypeScript CLI and toolset remain the shipped
eight-operation product. The retained, unpublished candidate implements the
three-operation company-to-report workflow through the Rust SDK, Rust CLI,
async Node SDK, and a current-host npm packaging proof. See
[ARCHITECTURE.md](../ARCHITECTURE.md) for the authoritative implementation,
candidate, and target boundaries.

## Durable decisions

- Preserve the repository, npm identity, `darty` command, eight operation
  names, and [CLI transport v1](../docs/specs/cli-transport-v1.md).
- Make the Rust SDK the sole owner of DART request construction, transport,
  bounds, decoding, parsing, normalization, and source failures.
- Keep the Node-API binding limited to asynchronous runtime translation and
  Node ergonomics, the Rust CLI as a `clap` executable over the SDK, and the
  npm launcher as native-artifact selection and process forwarding only.
- Remove the toolset export at cutover. Pi adapters, MCP servers, and other
  runtime-specific toolsets are not target products.
- Treat the OpenAPI document and HTML/viewer companion as wire authority;
  fixtures and observations are evidence.
- Preserve the TypeScript product as the runnable comparison baseline until
  the complete replacement passes the atomic-cutover gates.
- Keep executing publication, creating GitHub Releases, and pushing tags or
  branches outside this plan. Phase 4 includes the local workflow and package
  integration needed to make the cutover releasable without performing a
  release.
- Keep release-administration replacement separate in
  [the Release Please retirement plan](retire-release-please.md). Phase 4 later
  extends that plan's single tag-driven release line with the verified native
  artifacts selected at cutover.

## Completed foundation

Phases 0–2 froze the CLI v1 contract, established the canonical vertical wire
authority and fictional evidence corpus, proved Rust feasibility, and retained
the first three-operation Rust/Node/CLI workflow without changing root package
entry points. The durable results live in the
[CLI contract](../docs/specs/cli-transport-v1.md),
[wire authority](../docs/specs/README.md),
[provider record](../docs/research/dart-provider-qualification.md),
[feasibility record](../docs/research/rust-feasibility-v1.md), and
[architecture](../ARCHITECTURE.md).

## Phase 3 — complete capability and SDK parity

### Readiness dispositions

| Item | State | Blocks | Next action |
|---|---|---|---|
| Live `view-report` grammar drift for receipt `20260331000460` | requalification required | Counting `view-report` provider evidence as current | Refresh bounded evidence; update the viewer contract and fictional fixtures only if the source changed. |
| Viewer shell conformance | unresolved TS/Rust mismatches for regex literals, explicit no-TOC initialization, and tree bounds | Claiming cross-language viewer grammar parity | Port the two canonical TS rules to Rust; decide whether Rust bounds become canonical and add equivalent TS/fixture coverage or remove the candidate-only limits. |
| Provider approvals | no approval records | Completion of each source-backed port and final cutover qualification | Record named maintainer decisions only after reviewing an immutable evidence revision. |
| Model-assisted workflow eval | awaiting owner authorization for credentials and external model use | Release-readiness signoff for relevant CLI/eval/prompt changes; not local porting | Run after authorization, preserving deterministic trace and citation checks as prerequisites. |

These are evidence or operational gates. They do not authorize publication,
candidate promotion, relaxed source validation, or invented approval records.

### Remaining operations

- `search-body`
- `company-detail`
- `company-rss`
- `disclosure-types`
- `report-guide`

This is scope, not a fixed sequence. Select an operation only after reviewing
its contract and evidence plan.

### Per-operation completion

For every port:

- contract source and domain behavior before implementation;
- preserve validation, identifiers, references, warnings, typed failures,
  recovery hints, agent projections, and content bounds;
- extend SDK, CLI compatibility, malformed/oversized input, timeout,
  cancellation, sanitization, and package-acceptance checks as applicable;
- keep live and hosted-model checks bounded and outside credential-free CI.

For `search-body`, `company-detail`, and `company-rss`, completion additionally
requires refreshed bounded provider evidence, deterministic conformance, and
an explicit maintainer approval in the canonical
[provider record](../docs/research/dart-provider-qualification.md#maintainer-approval-records).
The static `disclosure-types` and `report-guide` operations do not require
provider qualification.

Phase 3 exits when all eight operations are available through every candidate
surface, pass the approved compatibility, SDK, package, and workflow checks,
and every source-backed port has current qualification and explicit approval.
The shipped TypeScript entry points remain unchanged at this milestone.

## Phase 4 — distribution and atomic cutover

- Requalify the complete source-backed set and record an explicit
  provider/platform/cutover approval.
- Select a supported Rust/Node target matrix from actual users and available
  CI; do not infer support from the current-host artifact.
- Test crates, SDKs, native packages, and CLI as clean external consumers.
- Verify declarations, cancellation, executable discovery, output bytes and
  exits, licenses, dependency policy, artifact contents, and secret hygiene.
- Switch root exports and `bin`; remove the TypeScript conformer, toolset,
  superseded tests/build paths, and unused dependencies in one reviewable
  change with a normal local revert path.
- Extend the tag-driven release path established by
  [the Release Please retirement plan](retire-release-please.md) with the
  selected native packages, GitHub Release assets, checksums, and clean-consumer
  verification; keep npm as the same versioned release's Node projection.
- Update product, architecture, release, and CI documentation to describe only
  the implemented Rust-backed product and its supported distribution matrix.

Phase 4 exits when one Rust implementation owns all supported source behavior,
all three target surfaces expose all eight operations, every claimed platform
passes clean-consumer validation, CLI v1 compatibility holds, and no
superseded TypeScript/toolset surface remains.

## Out of scope

- XBRL support, industry-code discovery, more held-out workflow cases, and a
  new large-report pagination contract; see [ROADMAP.md](../ROADMAP.md).
- CLI v2 or intentional redesign of current command behavior.
- Executing registry publication, creating a GitHub Release, or pushing remote
  tags or branches.

## Next action

Investigate the reproducible live viewer failure for receipt
`20260331000460` and reconcile provider, contract, and fixture evidence. Once
that disposition is reviewed, select one remaining operation and carry it
vertically through the Rust SDK, Node SDK, CLI, compatibility judge, and
package acceptance.
