# Architecture

Darty has one Rust implementation of eight read-only DART operations, shared
by a Rust SDK, asynchronous Node SDK, and standalone CLI. This document owns
repository topology; [VISION.md](VISION.md) owns product scope and
[ROADMAP.md](ROADMAP.md) owns delivery state.

## Implementation and release status

The repository implements the Rust cutover for version 0.6.1. Artifact
validation passes; [ROADMAP.md](ROADMAP.md) tracks integration delivery. Rust
remains unpublished. The latest
published standalone release, v0.6.0, contains the earlier Bun/TypeScript CLI.
Its availability does not certify the new Rust artifacts. Older npm releases
remain historical; npm registry publication is retired.

The superseded TypeScript DART implementation, entry points, source-local
toolset, superseded TypeScript tests, and npm CLI launcher are removed.
TypeScript remains only in the thin Node facade and development, evaluation,
and release tooling.

## Runtime boundaries

```text
Rust CLI (crates/darty-cli) ──┐
                            ├─ Rust SDK (crates/darty) → DART
Node facade (packages/node) ─┘
       through Node-API (crates/darty-node)
```

The SDK owns request validation, fixed-origin transport, pacing, deadlines,
byte limits, decoding, source parsing, identifiers, projections, and typed
failures. Static disclosure types and report guide are embedded SDK resources.

The CLI adapts SDK results to the CLI v1 process contract: arguments, help,
JSON/text output, diagnostics, and exits. The Node binding translates async
calls, cancellation, cleanup, and panic containment; the facade supplies public
TypeScript types and Promise ergonomics. Neither adapter parses DART itself.

The HTTP authority is [dart-wire-v1](docs/specs/dart-wire-v1.openapi.yaml).
Its [HTML/XML/viewer companion](docs/specs/dart-html-viewer-v1.md) owns source
grammar. Fictional fixtures and dated provider observations supply evidence,
not competing contracts.

## Code and validation map

- [`crates/darty`](crates/darty/) — Rust SDK and embedded static resources.
- [`crates/darty-cli`](crates/darty-cli/) — standalone executable adapter.
- [`crates/darty-node`](crates/darty-node/) and [`packages/node`](packages/node/) —
  asynchronous native binding and thin Node facade.
- [`fixtures/dart/vertical-v1`](fixtures/dart/vertical-v1/README.md) and
  [`fixtures/dart/parity-v1`](fixtures/dart/parity-v1/README.md) — fictional wire
  cases checked by Rust integration tests.
- [`test/compat/cli-v1`](test/compat/cli-v1/README.md) — independent CLI contract
  and golden expectations; `full` covers fixtures/faults and `process` runs
  without network access.
- [`scripts/test-sdk-consumers.mjs`](scripts/test-sdk-consumers.mjs) — clean
  external SDK consumers, declaration checks, cancellation and runtime safety.
- [`evals`](evals/README.md) — optional live subprocess and hosted-model checks.

## Artifact boundary

[Private GitHub Releases](https://github.com/cpaikr/darty/releases) remain the
artifact authority. [`scripts/standalone.mjs`](scripts/standalone.mjs) and the
[CLI target inventory](scripts/release-targets.json) build and certify native
archives, checksums, and installers. CLI installation loads no Node runtime.

[`scripts/sdk-artifacts.mjs`](scripts/sdk-artifacts.mjs) packages the Rust SDK
as a `.crate` and the Node SDK as platform-specific private tarballs for Linux
GNU x64 and Darwin ARM64. Each Node tarball includes its native addon; there
is no CLI launcher, install script, or optional platform-package dependency.
[`package.json`](package.json) is the version authority, checked against Cargo
and Node package versions.

All CI builds and automated runtime certification stay on Linux. Non-Linux
CLI targets and the Darwin addon are cross-built; local macOS checks do not
establish CI certification. Windows has no runtime certification claim.
The [release runbook](docs/release.md) owns exact artifact checks, installation,
recovery, and remaining approval/publication gates. Repository implementation
must not be presented as completed signoff or publication.
