# Architecture

This repo now has two layers:

- root docs that hold product and source-contract decisions
- a small implementation slice under `src/` plus opt-in live checks under `test/` for the first `dsab007` search capability

## Big Picture

The CLI is not the real app. The capability layer is: a semantic request
contract, a provider interface, and an execution path that normalizes errors and
shapes results. The CLI is one transport host over that core, and a future MCP
tool should sit at the same layer.

For layer diagrams, the schema derivation chain, the runtime pipeline, the
two-schema boundary, and the MCP extension seam, see
[src/ARCHITECTURE.md](src/ARCHITECTURE.md).

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

- [src/ARCHITECTURE.md](src/ARCHITECTURE.md)
  Layer overview, component map, schema derivation, runtime pipeline, and
  implementation invariants for the current `src/` slice.
- `test/live/`
  Opt-in live DART checks that exercise the shared client seam against the source.
- `test/cli/`
  Subprocess CLI smoke tests.

## Runtime Flow

The dominant current flow is:

```
argv -> src/cli.ts -> cli/commands/contents-search.ts
     -> executeContentsSearchCommand()
     -> capabilities/contents-search/execute.ts -> sources/dart/dsab007/contents/search.ts
     -> /dsab007/search.ax
```

See [src/ARCHITECTURE.md](src/ARCHITECTURE.md) for the full runtime pipeline,
layer boundaries, and step-by-step data transformations.

## Current Invariants

Implementation-level invariants (schema ownership, provider boundaries, replay
contract isolation) live in
[src/ARCHITECTURE.md § Invariants](src/ARCHITECTURE.md#invariants).

## Expected Expansion

If the current single-package shape holds up, expand carefully:

- `docs/specs/` for stable capability specs
- `src/` for the core capability while the surface is still small
- `packages/cli` only if the CLI outgrows a single-package layout
- `packages/mcp` only after the core contract is stable
- `evals/` for scenario-driven tests and transcripts
