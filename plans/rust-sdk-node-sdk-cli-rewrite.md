# Rust SDK, Node SDK, and CLI rewrite

## Outcome

Darty has one Rust-owned implementation of all eight accepted DART operations,
exposed through an idiomatic Rust SDK, an asynchronous Node SDK, and a separate
Rust `darty` CLI. The root npm package exports the Node SDK and forwards its
`bin` to platform-native artifacts. The superseded TypeScript DART conformer
and `@sjunepark/darty/toolset` are removed in one atomic cutover.

## Current state

This plan is active at phase 3.

| State | Product surface | Operations | Publication |
|---|---|---:|---|
| Shipped baseline | Bun/TypeScript CLI and `./toolset` | 8 | npm `0.5.0` |
| Retained candidate | Rust SDK, Rust CLI, async Node SDK, npm launcher | 3 | unpublished; current-host package only |
| Accepted target | Rust SDK, Node SDK, native CLI packages | 8 | pending phase 4 |

The retained candidate implements `search-company`,
`search-company-reports`, and `view-report`. It is isolated under `crates/` and
`candidate/npm/`; root exports and `bin` still select the shipped TypeScript
product. A current-host package proves the packaging shape only and is not a
platform-support claim.

## Decisions

- Preserve the repository, npm identity, `darty` command, eight operation
  names, and [CLI transport v1](../docs/specs/cli-transport-v1.md).
- Make the Rust SDK the sole owner of DART request construction, transport,
  bounds, decoding, parsing, normalization, and source failures.
- Keep the Node-API binding limited to asynchronous runtime translation and
  Node ergonomics. It must not reimplement DART behavior.
- Keep the Rust CLI as a separate `clap` executable over the public Rust SDK.
- Keep the npm launcher limited to selecting and executing matching native
  artifacts.
- Remove `@sjunepark/darty/toolset` at cutover. Pi adapters, MCP servers, and
  other runtime-specific toolsets are not target products.
- Treat the OpenAPI document and HTML/viewer companion as the candidate and
  target wire authorities. Fixtures and expectations are evidence, not
  competing authorities.
- Preserve the TypeScript product as the runnable comparison baseline until
  the complete replacement passes the atomic-cutover gates.
- Keep registry publication, releases, tags, and remote pushes outside this
  rewrite. They require separate authorization.

## Delivery status

### Phase 0 — baseline: complete

- Reconciled the first vertical capability contracts with implementation and
  bounded source evidence.
- Froze the CLI v1 process contract in a process-isolated black-box judge.
- Proved the judge detects deliberate output drift with mutation sentinels.

### Phase 1 — authority and feasibility: complete

- Established OpenAPI authority for the supported vertical wire subset and a
  companion contract for decoding, HTML, and viewer behavior.
- Added fictional fixtures, deterministic locks, and provider qualification.
- Built and discarded a bounded Rust feasibility slice before committing to
  the retained implementation.

### Phase 2 — first Rust workflow: complete

- Implemented the three-operation workflow in the Rust SDK, Rust CLI, and
  asynchronous Node SDK.
- Added a forwarding npm launcher and current-host native package acceptance.
- Kept all root TypeScript entry points unchanged.
- Merged the reviewed candidate on `main` at `73c29eb`.

### Phase 3 — complete capability and SDK parity: active

Before selecting the next operation, complete or explicitly disposition this
readiness checkpoint:

- Investigate the current live `view-report` `source_changed` result for
  receipt `20260331000460`. Refresh bounded provider evidence and the canonical
  viewer contract or fixtures if DART changed; preserve the fail-closed parser
  unless evidence supports a narrower correction.
- Obtain the repository owner action needed to repair or replace
  `RELEASE_PLEASE_TOKEN`, then verify Release Please on the exact successful
  `main` SHA. The repository-controlled SHA, tag, audit, compatibility, and
  mutation gates remain required regardless of token state.
- Decide and apply the available GitHub branch-protection or ruleset policy.
  If the account plan still cannot enforce it, record that limitation and keep
  the repository-controlled release gates as the enforceable boundary.
- Record explicit maintainer decisions in the canonical provider qualification
  approval records where required. Do not infer approval from fixtures, live
  probes, or successful CI.
- Run the model-assisted workflow evaluation only after an owner authorizes
  the credentials and external model usage. Preserve the deterministic trace,
  returned-ID, date-window, and citation checks as preconditions to prose
  judging.

These items are operational or evidence gates, not permission to publish,
promote the candidate, loosen source validation, or invent approval records.

Port these shipped TypeScript operations through the Rust SDK, Node SDK, and
CLI:

- `search-body`
- `company-detail`
- `company-rss`
- `disclosure-types`
- `report-guide`

The list above is scope, not an approved implementation sequence. No fixed port
order has been approved; the next operation is selected after its contract and
evidence plan receive maintainer review.

For each operation:

- contract source and domain behavior before porting;
- preserve semantic validation, identifiers, references, warnings, typed
  failures, recovery hints, agent projections, and content bounds;
- extend the black-box judge and SDK tests across happy paths, malformed and
  oversized source data, timeouts, cancellation, and sanitization;
- keep live checks bounded and separate from credential-free gates.

For each newly ported source-backed operation, Phase 3 also requires both of
these gates before counting the operation as complete:

1. Requalify the DART provider for that operation: refresh bounded live
   evidence, update the canonical contract and fictional fixtures when the
   evidence changes, and pass deterministic conformance checks.
2. Record explicit maintainer approval of that operation's qualification and
   port acceptance in the canonical [provider qualification approval records](../docs/research/dart-provider-qualification.md#maintainer-approval-records),
   including the approver, date, evidence revision, operation/surface,
   decision, and any remaining limitations. Fixture-only success or an
   unreviewed live probe is not approval.

The two gates apply to the source-backed ports (`search-body`, `company-detail`,
and `company-rss`); the static `disclosure-types` and `report-guide` ports still
need their contract, SDK, CLI, and compatibility checks. The current
three-operation provider record is conditional evidence, not a blanket
qualification for future operations.

Phase 3 exits when all eight operations are available through every candidate
surface, pass the approved compatibility, SDK, and workflow checks, and every
newly ported source-backed operation has both provider requalification and an
explicit maintainer approval record. The shipped TypeScript entry points remain
unchanged at this milestone.

### Phase 4 — distribution and atomic cutover: pending

- Before making any platform-support claim or starting cutover, requalify every
  source-backed operation against the current provider evidence and confirm
  that its Phase 3 approval record is still valid; record a new explicit
  maintainer approval for the complete provider/platform/cutover decision.
- Select a supported Rust/Node target matrix from actual users and available
  CI; do not infer support from the current-host artifact.
- Test the Rust crate, Node SDK, native packages, and CLI as clean external
  consumers.
- Verify declarations, cancellation, executable discovery, output bytes and
  exits, licenses, dependency policy, artifact contents, and secret hygiene.
- Update product, architecture, release, and CI documentation to describe only
  the implemented Rust-backed product.
- Switch root package exports and `bin`, then remove the TypeScript conformer,
  toolset export, superseded tests/build paths, and unused dependencies in one
  reviewable change.
- Preserve a normal local revert path before any separately authorized
  publication.

## Completion criteria

- One Rust implementation owns every supported DART wire, transport, parser,
  domain, and source-failure rule.
- Rust SDK, Node SDK, and CLI expose all eight operations with project-owned
  types and stable references.
- The root npm package exports the Node SDK and a forwarding-only `darty` bin;
  every claimed platform passes clean-consumer validation.
- The CLI passes the approved v1 judge and workflow eval.
- Canonical wire documents, locks, fixtures, and implementation agree.
- No TypeScript DART conformer or toolset compatibility surface remains.

## Out of scope

- New XBRL support, industry-code discovery, expanded held-out workflow cases,
  and a new large-report pagination contract; see [the roadmap](../ROADMAP.md).
- A CLI v2 or intentional redesign of current command behavior.
- Registry publication, GitHub Release creation, or remote tags.

## References

- [Product vision](../VISION.md)
- [Architecture](../ARCHITECTURE.md)
- [CLI transport v1](../docs/specs/cli-transport-v1.md)
- [DART source map](../docs/research/dart-source-map.md)
- [Provider qualification approval records](../docs/research/dart-provider-qualification.md#maintainer-approval-records)
- [Specification index](../docs/specs/README.md)

## Next action

Complete or explicitly disposition every Phase 3 readiness-checkpoint item
above. Then select one operation with an approved contract/evidence plan and
carry it vertically through the Rust SDK, Node SDK, CLI, judge, and package
acceptance. For a source-backed operation, do not mark the slice complete until
its provider requalification and explicit maintainer approval are recorded.
