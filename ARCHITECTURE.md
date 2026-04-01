# Architecture

This repo now has two layers:

- root docs that hold product and source-contract decisions
- a small implementation slice under `src/` plus opt-in live checks under `test/` for the first `dsab007` search capability

## Document Ownership

- [README.md](README.md)
  Orientation, repo stance, and reading order.
- [VISION.md](VISION.md)
  Product-level goal, scope, and non-goals for the current project.
- [docs/research/dart-source-map.md](docs/research/dart-source-map.md)
  Durable source investigation notes for `dsab007` search and the report viewer.
- [docs/tools/](docs/tools/)
  Canonical home for single-tool design.
- [docs/specs/](docs/specs/)
  Stable, evidence-backed capability specs once the contract is ready.
- `src/`
  Current implementation root for `dsab007` contracts, request building, parsers, CLI commands, and colocated deterministic tests.
- `test/`
  Opt-in live or broader integration checks that should stay separate from module-local fixture tests.
  Use `test/live/` for live DART coverage and `test/cli/` for subprocess CLI smoke tests.

## Contributor Flow

1. Start with [README.md](README.md).
2. If the work is about the current product, read [VISION.md](VISION.md) first.
3. Use [docs/research/dart-source-map.md](docs/research/dart-source-map.md) to understand what the live source actually exposes today.
4. Use [docs/tools/foundations.md](docs/tools/foundations.md) and the linked tool docs to shape the contract.
5. Promote only evidence-backed, implementation-ready capability specs into [docs/specs/](docs/specs/README.md).
6. Keep the first implementation slice small: `dsab007` contracts, shared request/client seams, one mode parser, and CLI before section retrieval.
7. Keep tool rules in the tool docs; link to canonical guidance instead of duplicating it.

## Invariants

- Keep product vision at the repo root, not mixed into specs or plans.
- Keep source investigation notes outside `docs/specs/`; only promote stable contract decisions into specs.
- Keep tool contract rules in [docs/tools/contracts.md](docs/tools/contracts.md), not in project notes.
- Prefer links to canonical guidance over repeating the same rule in multiple files.
- Mark source observations as observed, inferred, or unverified; do not blur them together.

## Current Code Shape

- `src/cli.ts`
  Local CLI entrypoint and command dispatch.
- `src/cli/commands/`
  Mode-specific CLI commands over the shared `dsab007` surface.
- `src/tools/operations/`
  Transport-agnostic operation metadata that CLI, MCP, or SDK layers can share.
- `src/dart/dsab007/contracts.ts`
  DART-shaped request contracts for the implemented `dsab007` mode.
- `src/dart/dsab007/request.ts`
  Request builder that expands the public contract into the full DART form replay.
- `src/dart/dsab007/client.ts`
  Shared transport and execution for `/dsab007/search.ax`.
- `src/dart/dsab007/models.ts`
  Parsed `dsab007` response models.
- `src/dart/dsab007/parsers/`
  Mode-specific HTML parsers under the shared search surface, with colocated fixture-backed parser tests.
- `src/dart/errors.ts`
  Tagged error types for invalid input, source failures, and parser drift.
- `test/live/`
  Opt-in live DART checks that exercise the shared client seam against the source.

## Expected Expansion

If the current single-package shape holds up, expand carefully:

- `docs/specs/` for stable capability specs
- `src/` for the core capability while the surface is still small
- `packages/cli` only if the CLI outgrows a single-package layout
- `packages/mcp` only after the core contract is stable
- `evals/` for scenario-driven tests and transcripts
