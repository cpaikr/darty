# AGENTS.md

## Scope

- Darty is a read-only DART querying and retrieval tool, not only a body-search
  command.
- The repository implementation is Rust: `crates/darty` owns all eight
  operations, `crates/darty-cli` exposes the CLI, and `crates/darty-node` plus
  `packages/node` expose the async Node SDK. The superseded TypeScript DART source, conformer,
  source-local toolset, and candidate npm launcher are removed.
- Rust v0.6.1 is published; `ROADMAP.md` owns subsequent delivery status.
  The v0.6.0 standalone CLI is historical Bun/TypeScript. Treat repository docs,
  code, tests, and configuration as truth; implementation is not publication.

## Read First

- Start with `README.md` for usage and release availability.
- Read `VISION.md` for the accepted target and non-goals.
- Read `ARCHITECTURE.md` for SDK, CLI, and artifact boundaries.
- Read `ROADMAP.md` and its linked plan for active delivery state.
- For DART wire, parser, or capability work, read the relevant documents under
  `docs/research/` and `docs/specs/`.

## Commands

- Install dependencies: `bun install`
- Validate DART wire authority: `bun run check:dart-wire`
- Typecheck: `bun run typecheck`
- Test development/eval/release tooling: `bun test`
- Build release Rust CLI and native addon: `bun run build`
- Check version agreement: `bun run check:versions`
- Check clean SDK consumers: `bun run test:sdk`
- Check local standalone installation: `bun run test:standalone`
- Check CLI v1 compatibility: `bun run test:compat:cli`
- Run the opt-in live CLI workflow: `bun run test:live`
- Manually search: `bun run search --keyword <text> --start-date YYYYMMDD --end-date YYYYMMDD`
- Test the Rust workspace: `cargo test --workspace --all-features --locked`
- Lint the Rust workspace: `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`

Document only commands that exist or direct Cargo commands enforced in CI. Do
not add placeholder build, lint, or format commands.

## Document Ownership

- CLI installation and usage: `README.md`; Windows recovery and PATH setup:
  `docs/windows-installation.md`
- Product scope, target surfaces, and non-goals: `VISION.md`
- Repository topology and implementation status: `ARCHITECTURE.md`
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
- Public GitHub Releases own standalone CLI archives, Rust SDK archives, and
  platform-specific Node SDK tarballs; npm registry publishing is retired.
  Node SDK installation is separate from CLI installation.
- All CI jobs, including cross-builds and automated runtime certification,
  stay on Linux. Do not infer macOS/Windows runtime certification from successful
  cross-builds. The release runbook owns the target-specific evidence.
- Publication, paid model evals, and human production approval remain separate
  gates. Never infer them from repository completion or passing tests.

## Working Rules

- Keep diffs small and edit the canonical document instead of repeating facts.
- Keep DART semantics in the Rust SDK. The CLI and Node facade are adapters;
  do not recreate a TypeScript conformer or npm CLI installation path.
- Preserve independent wire fixtures and CLI expectations. Do not regenerate
  acceptance expectations from the implementation to hide a contract change.
- Keep the implementation read-only and reference-first unless product docs
  change that contract.
- Update nearby tests and docs together when behavior, contracts, or evidence
  changes.
- Label source claims as observed, inferred, project decision, or unknown when
  the distinction matters.
