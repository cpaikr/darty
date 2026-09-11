# Learning Guide

This page is the onboarding route for readers new to Darty. It does not own
product, implementation, contract, or delivery truth.

## Start Here

1. [`README.md`](../../README.md) — what users can install and run today.
2. [`VISION.md`](../../VISION.md) — product scope, principles, and selected future capabilities.
3. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — Rust ownership, adapters, and the repository/publication boundary.
4. [`ROADMAP.md`](../../ROADMAP.md) — current work and backlog.

## Follow The Work

| Question | Canonical source |
|---|---|
| How do the Rust core and adapters work? | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |
| What does an operation accept and return? | [`docs/specs/`](../specs/README.md) and the code-backed schemas |
| What DART behavior was observed? | [`docs/research/dart-source-map.md`](../research/dart-source-map.md) |
| What DART wire contract does the Rust SDK enforce? | [`dart-wire-v1.openapi.yaml`](../specs/dart-wire-v1.openapi.yaml) and [`dart-html-viewer-v1.md`](../specs/dart-html-viewer-v1.md) |
| How is CLI compatibility frozen? | [`test/compat/cli-v1/README.md`](../../test/compat/cli-v1/README.md) |
| Which validation layer should I run? | [`evals/README.md`](../../evals/README.md), repository CI, and `AGENTS.md` |
