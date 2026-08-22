# Rewrite Darty around a Rust SDK, Node SDK, and CLI

## Outcome

Darty has one Rust-owned implementation of its supported DART behavior, exposed
as an idiomatic Rust SDK, an idiomatic Node SDK through Node-API, and the
separate Rust `darty` CLI built with `clap`. The npm package exposes the Node
SDK and forwards its `bin` to the platform's compiled Rust executable. All eight
current operations and the CLI v1 process contract remain compatible through
an evidence-backed atomic cutover, while the superseded TypeScript DART
implementation and `@sjunepark/darty/toolset` surface are removed.

## Current state

- Version `0.5.0` is a Bun/strict TypeScript npm product. It implements eight
  operations through a transport, composition, capability, and DART-source
  layering described in [the current source architecture](../src/ARCHITECTURE.md).
- The supported public surfaces today are the npm-installed `darty` CLI and
  `@sjunepark/darty/toolset`. The rewrite retains the CLI behavior, replaces
  the toolset with a Node SDK, and adds a Rust SDK.
- [CLI transport v1](../docs/specs/cli-transport-v1.md) defines the compatibility
  boundary for stdout, stderr, exit status, help, home output, typed failures,
  and agent projections. The company lookup -> filing search -> report TOC ->
  report section workflow is the strongest existing end-to-end product proof.
- The process-isolated CLI v1 judge under `test/compat/cli-v1/` now freezes the
  specified transport, help, validation, and network-free behavior through
  independently authored expectations. Its mutation proof changes only a
  disposable built bundle and demonstrates that the judge rejects drift.
- The source map and the three vertical capability specs have been reconciled
  with current code and tests. They distinguish observed source behavior,
  inferred replay findings, project decisions, implemented compatibility
  behavior, and known quirks.
- The current npm-only release process and TypeScript architecture remain in
  force until cutover. Phase 2 now supplies an isolated, reviewed Rust workspace,
  asynchronous Node-API candidate, Clap CLI, forwarding npm launcher, and one
  current-host native package for the three-operation vertical workflow. These
  candidate surfaces are not active package entry points and make no supported
  platform or publication claim.

## Decisions

- Keep the repository, history, npm package identity, `darty` command name, all
  eight operation names, and CLI v1 behavior. Treat intentional CLI changes as
  separate future product decisions rather than rewrite latitude.
- Make the Rust SDK the sole conformer for DART HTTP, HTML, RSS, viewer, and
  related source behavior. Rust owns request preparation, transport policy,
  safety bounds, decoding and parsing, domain normalization, and sanitized
  source failures.
- Expose an idiomatic asynchronous Node SDK through a narrow Node-API binding.
  The binding and Node facade may translate project-owned values and improve
  JavaScript ergonomics, but they do not own URLs, wire fields, transport,
  parsing, retries, or source semantics.
- Build the CLI as a separate Rust executable with `clap`, depending on the
  public Rust SDK. The CLI owns argument parsing, help, validation
  presentation, output, and process exits; it does not duplicate SDK source or
  DART behavior.
- Make the root `@sjunepark/darty` export the Node SDK and retain its `darty`
  package `bin`. The bin is a forwarding-only launcher that selects and
  executes the matching compiled Rust CLI. It owns no argument parsing, help,
  validation, output shaping, or DART behavior.
- Package the Rust CLI executable and Node-API addon in platform-specific
  optional npm packages selected by the root package. Compiling the shared Rust
  SDK into both native artifacts does not create a second source owner.
- Remove `@sjunepark/darty/toolset` at cutover. Do not add Pi adapters, MCP
  servers, browser automation, or other runtime-specific toolsets.
- Make OpenAPI the repository authority for the supported external HTTP wire
  subset. When OpenAPI cannot truthfully express HTML structure or viewer
  replay rules, use a narrowly named language-neutral companion contract with
  explicit provenance rather than hiding those facts in Rust code.
- Keep fictional fixtures and independently authored expectations as evidence,
  not competing authorities. Label provider claims documented, observed,
  inferred, project decision, or unknown.
- Preserve the existing TypeScript product as the runnable comparison baseline
  until one atomic cutover removes superseded paths. Do not maintain two
  long-lived implementations or a compatibility layer after cutover.
- Use Anthropic's migration-kit method as adapted by `ytm`: freeze observable
  behavior with a mutation-tested judge, prove a disposable vertical slice,
  implement by subsystem, review high-risk boundaries independently, and
  cut over only after parity and packaged-consumer evidence pass.
- Keep registry publication, release creation, and any remote archive/tag push
  outside the rewrite. Exact supported platforms and release/version coupling
  must be selected and proven before documentation claims support.

## Delivery plan

### 0. Establish a recoverable and truthful baseline

- Reconcile stale implementation claims in the source map and capability specs
  against current code, fixtures, tests, and bounded live evidence. Keep
  research observations separate from stable contract decisions. Reconcile and
  approve the `search-company`, `search-company-reports`, and `view-report`
  contracts before implementing their Rust replacements.
- Inventory the eight CLI operations, inputs, envelopes, errors, references,
  agent projections, help paths, package contents, and the four-step report
  workflow. Review this inventory before it becomes parity authority.
- Build a process-isolated black-box CLI judge with independently authored
  scenarios and golden results. Prove it detects at least one deliberate
  behavioral mutation rather than merely replaying implementation output.
- Record a validated pre-rewrite commit with a non-release archive marker and
  use an isolated rewrite integration branch or worktree. Keep external pushes
  subject to explicit authorization.

### 1. Establish source authority and prove Rust feasibility

- Define the supported DART HTTP subset in OpenAPI and name any necessary
  language-neutral HTML/viewer companion contracts. Add validation and
  freshness checks before relying on derived artifacts.
- Once that authority exists, remove duplicated wire rules from capability
  specs or label them as non-authoritative evidence linked to the canonical
  contract. Existing replay notes must not remain a competing source of truth.
- Curate independent fictional fixtures for HTML, RSS, viewer navigation,
  encodings, empty results, malformed responses, size bounds, and typed source
  failures. Preserve evidence provenance without storing unrestricted live
  response bodies.
- Record provider qualification separately from protocol conformance,
  including documented versus observed behavior, access status, pacing,
  retries, retention, monitoring, and withdrawal criteria.
- Build and discard a bounded Rust feasibility slice for company search,
  company filing search, and report TOC/section retrieval. Treat inability to
  reproduce required encoding, parsing, cancellation, or transport behavior as
  a design blocker.

### 2. Deliver the first vertical Rust workflow

- Establish the Rust SDK boundary, project-owned request/result/reference/error
  types, bounded HTTP transport, and pure deterministic parsing/domain core.
- Implement `search-company`, `search-company-reports`, and `view-report` in the
  Rust SDK, including the progressive TOC/section workflow and content-window
  semantics defined by the reconciled
  [company-search](../docs/specs/dsae001-search-company-v1.md),
  [filing-search](../docs/specs/dsab007-search-company-reports-v1.md), and
  [report-viewing](../docs/specs/dsaf001-view-report-v1.md) contracts.
- Expose the same workflow through a candidate Node package with the intended
  root SDK export and asynchronous Node-API binding. Validate async behavior,
  cancellation, panic containment, safe error translation, and generated
  declaration freshness.
- Implement the candidate `darty` CLI as a separate `clap` executable over the
  Rust SDK, and expose that executable through a forwarding-only npm launcher.
  Validate CLI stdout/stderr/exit behavior and prove the launcher does not own
  command semantics.
- Build one current-host candidate optional package containing the Rust CLI and
  Node-API addon so clean-consumer tests exercise the real launcher and native
  boundary. This feasibility artifact makes no platform-support claim; the
  supported matrix remains a cutover gate.
- Pass the reviewed judge scenarios and the four-step workflow eval without
  consulting TypeScript implementation internals. Review the wire authority,
  parsers, transport, SDK boundaries, and public projections independently.
- Keep the active root package exports, `bin`, and all eight TypeScript commands
  unchanged. Phase 2 exits only when the three candidate commands satisfy their
  reconciled contracts and shared CLI transport rules; full eight-command
  help/home parity and public entry-point replacement remain later milestones.

### 3. Reach complete capability and SDK parity

- Port `search-body`, `company-detail`, `company-rss`, `disclosure-types`, and
  `report-guide` into the Rust SDK and expose them through the Node SDK and CLI.
- Preserve semantic validation, stable identifiers, source provenance,
  references, warnings, typed failures, recovery hints, `--agent` projections,
  content limits, and deterministic output required by the approved contracts.
- Expand the judge across every accepted operation and adversarial boundary,
  including encodings, malformed/oversized source data, redirects, timeouts,
  cancellation, unknown upstream values, and sanitization.
- Keep live transport verification bounded and separate from credential-free
  contract, parser, SDK, CLI, and packaging gates.

### 4. Prove distributability and cut over atomically

- Select an explicit Rust and Node native target matrix based on actual users
  and available CI. Each platform package carries the matching Rust CLI
  executable and Node-API addon. A platform becomes supported only after both
  artifacts build and pass clean-consumer tests.
- Inspect and test the packaged Rust SDK, Node SDK, native packages, and CLI as
  external consumers. Verify declarations, async behavior, cancellation,
  executable discovery, stdout/stderr/newlines, exit status, licenses,
  dependency policy, artifact contents, and absence of secrets or raw evidence.
- Update README, architecture, specs, release documentation, CI, and live smoke
  to describe only the implemented Rust-backed product. Decide version and tag
  coupling before enabling release automation for the new artifact set.
- In one reviewable cutover, switch package and CLI entry points, then remove
  the TypeScript DART conformer, `@sjunepark/darty/toolset`, superseded tests and
  build paths, and any Bun/Effect/Cheerio dependency no longer justified.
- Preserve a normal revert path before publication. Publication or changes to
  external registry state require separate explicit authorization.

## Completion criteria

- One Rust implementation owns every supported DART wire, transport, parsing,
  domain, and source-failure rule; no TypeScript DART conformer remains.
- The Rust SDK, Node SDK, and `darty` CLI expose all eight accepted operations
  with documented project-owned types and source references.
- The root npm package exposes the Node SDK and a forwarding-only `darty` bin;
  platform packages supply the matching compiled Rust CLI and Node-API addon
  without duplicating command or DART behavior in JavaScript.
- The CLI passes the approved v1 black-box parity judge and workflow eval; both
  SDKs and every claimed platform pass clean packaged-consumer validation.
- OpenAPI and any named companion contracts are the sole wire authorities, with
  enforced validation/freshness and independently authored evidence.
- Current architecture, product, package, CI, and release documents describe
  the cut-over implementation without retaining the toolset as a public
  surface or leaving migration behavior trapped in this plan.
- Security/dependency checks, bounded live verification, repository-level code
  review, and the complete documented validation suite pass at the final head.

## Out of scope

- Pi adapters, MCP servers, browser automation, and other runtime-specific
  toolsets.
- New XBRL support, industry-code discovery, expanded held-out workflow cases,
  and a new large-report pagination contract beyond behavior required for
  current parity. These remain separate tasks in [the roadmap](../ROADMAP.md).
- A CLI v2 or intentional breaking redesign of current command behavior.
- Registry publication, GitHub Release creation, remote tag publication, or
  claims for unverified platforms.

## References

- [Product vision](../VISION.md)
- [Current architecture](../ARCHITECTURE.md)
- [CLI transport v1](../docs/specs/cli-transport-v1.md)
- [DART source map](../docs/research/dart-source-map.md)
- [YTM Rust/Node rewrite plan](https://github.com/cpaikr/ytm/blob/main/plans/rust-node-rewrite.md)
- [Rust for external HTTP protocol implementations](https://github.com/sjunepark/mytech/blob/d20f8c511979dd0cfcdbf4f046f0b145dce38e79/architecture/external-http/rust-for-external-http-protocols.md)
- [External HTTP contracts and handwritten clients](https://github.com/sjunepark/mytech/blob/d20f8c511979dd0cfcdbf4f046f0b145dce38e79/architecture/external-http/external-http-contracts-and-handwritten-clients.md)
- [Rust cores for Node.js HTTP SDKs](https://github.com/sjunepark/mytech/blob/d20f8c511979dd0cfcdbf4f046f0b145dce38e79/architecture/external-http/rust-cores-for-nodejs-http-sdks.md)
- [Automation-facing CLI contracts](https://github.com/sjunepark/mytech/blob/d20f8c511979dd0cfcdbf4f046f0b145dce38e79/practices/automation-facing-cli-contracts.md)

## Next action

Begin phase 3 by contracting and porting `search-body`, `company-detail`,
`company-rss`, `disclosure-types`, and `report-guide` through the Rust SDK,
Node SDK, and CLI. Preserve the active TypeScript product until complete
eight-operation parity and the phase 4 atomic-cutover gates are ready.
