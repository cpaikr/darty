# Learning Guide

This page is the onboarding route for readers new to Darty. It does not own
product, implementation, contract, or delivery truth.

## Start Here

1. [`README.md`](../../README.md) — what users can install and run today.
2. [`VISION.md`](../../VISION.md) — the selected Rust SDK, Node SDK, and CLI
   destination.
3. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — the shipped TypeScript product,
   retained Rust candidate, and target boundary in one status map.
4. [`ROADMAP.md`](../../ROADMAP.md) — current delivery phase and backlog.

## Follow The Work

| Question | Canonical source |
|---|---|
| How does the active TypeScript implementation work? | [`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) |
| What does an operation accept and return? | [`docs/specs/`](../specs/README.md) and the code-backed schemas |
| What DART behavior was observed? | [`docs/research/dart-source-map.md`](../research/dart-source-map.md) |
| What wire subset does the Rust vertical candidate conform to? | [`dart-wire-v1.openapi.yaml`](../specs/dart-wire-v1.openapi.yaml) and [`dart-html-viewer-v1.md`](../specs/dart-html-viewer-v1.md) |
| How is CLI compatibility frozen? | [`test/compat/cli-v1/README.md`](../../test/compat/cli-v1/README.md) |
| Which validation layer should I run? | [`evals/README.md`](../../evals/README.md), repository CI, and `AGENTS.md` |
