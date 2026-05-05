# Learning Guide

This directory is onboarding material for programmers who are new to `darty`. It explains how the repo fits together and where to start reading.

These pages are not the authoritative source for implementation behavior, product scope, or project policy. When accuracy matters, defer to the source code, tests, [README](../../README.md), [VISION](../../VISION.md), root [ARCHITECTURE](../../ARCHITECTURE.md), source [ARCHITECTURE](../../src/ARCHITECTURE.md), [specs](../specs/README.md), and source investigation notes under [docs/research](../research/dart-source-map.md).

## Recommended Reading Path

1. [System overview](system-overview.md) — what `darty` is trying to make easy and why the current slice is small.
2. [Codebase map](codebase-map.md) — where the major directories live and what each owns.
3. [Runtime flows](runtime-flows.md) — how a `contents-search` call moves from CLI or MCP to DART and back.
4. [Contracts and boundaries](contracts-and-boundaries.md) — the public semantic contract, internal replay contract, provider seam, and error ownership.
5. [DART source adapter](dart-source-adapter.md) — how the current `dsab007` contents adapter builds forms, fetches HTML, parses rows, and protects source-specific details.
6. [Verification map](verification-map.md) — how colocated tests, live tests, CLI checks, and model-in-the-loop evals divide responsibility.

## Fast Mental Model

`darty` is a read-only DART access tool. The current implementation exposes one public capability, `contents-search`, through two thin transports:

```text
CLI flags or MCP args
        |
        v
shared contents-search operation
        |
        v
semantic request/result contract
        |
        v
DART dsab007 contents source adapter
        |
        v
structured JSON envelope with references and warnings
```

The important architectural idea is that CLI and MCP are hosts over the same core. The capability contract and executor decide semantic behavior; source adapters handle DART-specific replay and parsing.
