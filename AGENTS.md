# AGENTS.md

## Scope

- Darty is a read-only DART querying and retrieval tool, not only a body-search
  command.
- The shipped product is the Bun/strict TypeScript implementation in
  `src/`. A reviewed Rust/Node/CLI candidate exists under `crates/` and
  `candidate/`, but it is unpublished and supports only the vertical workflow.
- Treat repository docs, code, tests, and configuration as the source of truth.
  Do not promote candidate or target behavior to shipped behavior.

## Read First

- Start with `README.md` for the shipped package.
- Read `VISION.md` for the accepted target and non-goals.
- Read `ARCHITECTURE.md` for current, candidate, and target boundaries.
- Read `ROADMAP.md` and its linked plan for active delivery state.
- For DART wire, parser, or capability work, read the relevant documents under
  `docs/research/` and `docs/specs/`.

## Commands

- Install dependencies: `bun install`
- Validate DART wire authority: `bun run check:dart-wire`
- Typecheck: `bun run typecheck`
- Test the TypeScript product: `bun test`
- Build the TypeScript comparison baseline: `bun run build`
- Check local standalone installation: `bun run test:standalone`
- Check CLI v1 compatibility: `bun run test:compat:cli`
- Run live tests: `bun run test:live`
- Manually search: `bun run search --keyword <text> --start-date YYYYMMDD --end-date YYYYMMDD`
- Test the Rust candidate: `cargo test --workspace --all-features --locked`
- Lint the Rust candidate: `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`

Document only commands that exist or direct Cargo commands enforced in CI. Do
not add placeholder build, lint, or format commands.

## Document Ownership

- CLI installation and usage: `README.md`
- Product scope, target surfaces, and non-goals: `VISION.md`
- Repository topology and implementation status: `ARCHITECTURE.md`
- Source implementation details: `src/ARCHITECTURE.md`
- Active order and backlog: `ROADMAP.md`, `plans/`, and `tasks/`
- Live DART evidence: `docs/research/`
- Stable capability and transport contracts: `docs/specs/`
- Shared tool-design guidance: `docs/tools/`
- AXI upstream baseline and drift review: `docs/upstreams/axi.md` and
  `docs/upstreams/axi-baseline.json`
- Release automation and secrets: `docs/release.md`

## Release and Publishing

- Read `docs/release.md` before release work.
- Prepare releases through reviewed `package.json` version commits, then use
  the explicit source-tag procedure in `docs/release.md` only after exact-commit
  CI succeeds. Do not move or reuse a release tag.
- Keep `CHANGELOG.md` as release history through `v0.5.0`. GitHub generated
  release notes own later release summaries; do not maintain a second
  changelog line.
- Release standalone TypeScript CLI archives through private GitHub Releases;
  npm publishing is retired. All CI jobs, including cross-builds, stay on Linux.
  The Rust candidate must not be published or described as supported before the
  active plan's cutover gates are complete and `docs/release.md` is updated.

## Working Rules

- Keep diffs small and edit the canonical document instead of repeating facts.
- Preserve the TypeScript product as the runnable comparison baseline until the
  rewrite's atomic cutover. Phase 3 work belongs in the Rust SDK, Node SDK
  candidate, and Rust CLI, not in a parallel extension of TypeScript behavior.
- Keep the implementation read-only and reference-first unless product docs
  change that contract.
- Update nearby tests and docs together when behavior, contracts, or evidence
  changes.
- Label source claims as observed, inferred, project decision, or unknown when
  the distinction matters.
