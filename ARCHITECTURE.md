# Architecture

This document owns repository topology and implementation status. Detailed
TypeScript layering lives in [src/ARCHITECTURE.md](src/ARCHITECTURE.md); product
destination and delivery order live in [VISION.md](VISION.md) and
[ROADMAP.md](ROADMAP.md).

## Implementation Status

| State | Public status | Location | Capability coverage |
|---|---|---|---|
| Current implementation | TypeScript CLI; standalone delivery published in v0.6.0 | `src/`, `scripts/standalone.mjs` | Eight operations through the CLI with an embedded Bun runtime |
| Historical distribution | Existing npm versions retained, no further publication | Earlier `@sjunepark/darty` releases | Node-based CLI and `./toolset` in those released versions |
| Rewrite candidate | Implemented; Phase 3 validation and PR delivery in progress; unpublished | `crates/`, `candidate/npm/` | All eight operations through Rust SDK, async Node SDK, and Rust CLI |
| Accepted target | Capability implementation present; artifact delivery and cutover pending | `VISION.md` | One Rust-owned implementation for all eight operations, exposed through Rust SDK, Node SDK, and CLI |

The candidate does not replace the standalone TypeScript CLI. Its current-host
native package proves Darwin ARM64 packaging only; it is not a supported
platform matrix or release artifact.

## Repository Map

- [`README.md`](README.md) — standalone CLI installation and usage.
- [`VISION.md`](VISION.md) — accepted product shape, scope, and non-goals.
- [`ROADMAP.md`](ROADMAP.md) and [`plans/`](plans/) — delivery status, remaining
  work, and next action.
- [`docs/specs/`](docs/specs/README.md) — stable public capability, CLI, and
  supported upstream wire contracts.
- [`docs/research/`](docs/research/dart-source-map.md) — non-normative source
  observations, provenance, provider qualification, and feasibility evidence.
- [`docs/tools/`](docs/tools/) — reusable tool-design guidance; not product
  implementation status.
- [`docs/learning/`](docs/learning/INDEX.md) — a short onboarding route to the
  canonical documents and code.
- [`scripts/standalone.mjs`](scripts/standalone.mjs) and
  [`release-targets.json`](scripts/release-targets.json) — cross-builds, archives,
  installation certification, and release inventory; operations remain in `src/`.
- [`src/`](src/ARCHITECTURE.md) — active Bun/TypeScript implementation and
  deterministic tests.
- `crates/darty` — retained Rust SDK candidate and sole candidate DART conformer.
- `crates/darty-cli` — thin Clap subprocess adapter over the Rust SDK.
- `crates/darty-node` — narrow asynchronous Node-API binding.
- `candidate/npm/` — unpublished root Node SDK/launcher and current-host native
  package shapes.
- [`fixtures/dart/vertical-v1/`](fixtures/dart/vertical-v1/README.md) and
  [`fixtures/dart/parity-v1/`](fixtures/dart/parity-v1/README.md) — fictional,
  cross-language wire evidence for all source-backed operations.
- [`test/compat/cli-v1/`](test/compat/cli-v1/README.md) — implementation-neutral
  CLI compatibility corpus.
- [`evals/`](evals/README.md) — opt-in live and model-in-the-loop task checks.

## Current TypeScript Implementation

The active product has four layers:

```text
CLI or source-local toolset
      -> src/app composition
      -> src/capabilities semantic contracts and execution
      -> src/sources/dart request, transport, parsing, and source errors
```

The capability layer owns semantic validation and result/failure envelopes;
the CLI owns process UX; DART-shaped fields remain inside source adapters. See
[src/ARCHITECTURE.md](src/ARCHITECTURE.md) for the component and runtime maps.

## Retained Rewrite Candidate

```text
Rust SDK (crates/darty) -> DART
          |-> Rust CLI (crates/darty-cli)
          `-> Node-API binding (crates/darty-node)
                    `-> Node SDK facade (candidate/npm/darty)

candidate npm bin -> platform package -> compiled Rust CLI
```

The Rust SDK owns candidate request construction, transport policy, bounds,
decoding, parsing, domain normalization, and sanitized source failures. The CLI
and Node binding translate surface concerns without creating a second DART
implementation.

The supported seven-call upstream subset for the candidate is canonical in
[`dart-wire-v1.openapi.yaml`](docs/specs/dart-wire-v1.openapi.yaml) and
[`dart-html-viewer-v1.md`](docs/specs/dart-html-viewer-v1.md). The fictional
fixture corpus and provider qualification are evidence, not competing
authorities.

## Target Boundary

The current release pipeline cross-compiles `src/cli.ts` with Bun into native
executables and publishes private GitHub Release archives. The Bun runtime is
embedded; no external JS runtime is part of CLI installation. The root package
is private. `bun run build` still produces the Node-compatible comparison
baseline and source-local toolset modules for rewrite validation, not npm delivery.

At cutover, all eight operations move behind the Rust SDK and its CLI replaces
the compiled TypeScript executable through the same standalone release channel.
The Node SDK remains a target surface; its independent installation projection
must be specified and verified before it is published. CLI installation must
remain independent of Node/npm. The TypeScript conformer and source-local toolset
are removed only when the full rewrite passes its cutover gates.

## Documentation Invariants

- README distinguishes available release artifacts from pending delivery.
- Architecture records implementation topology and status, not delivery order.
- Vision records the selected destination, not completion claims.
- Roadmap and the active plan own progress and next actions.
- Specs own stable contracts; research owns observations and unknowns.
- Source evidence must be labeled, and candidate evidence must not imply a
  supported release or platform.
