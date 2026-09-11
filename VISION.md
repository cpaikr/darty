# DART Access Tool Vision

## Product

- `name`: `darty`
- `status`: accepted target
- `domain`: Korean corporate disclosures, filing metadata, and document sections from DART
- `users`: LLM agents, agent developers, investors, researchers, and internal automation that need reliable DART access

Implementation status and delivery order live in [ARCHITECTURE.md](ARCHITECTURE.md)
and [ROADMAP.md](ROADMAP.md).

## Goal

Build a tool that gives agents a stable, programmatic way to search and retrieve filing data from `https://dart.fss.or.kr/`.

The target experience should be closer to `yfinance` than browser automation:

- small semantic operations
- predictable structured results
- stable identifiers and references
- easy local scripting for humans
- an idiomatic Rust SDK for Rust callers
- an idiomatic Node SDK backed by the same Rust implementation
- easy use by humans and agents through the versioned `darty` CLI subprocess contract

## Why This Exists

Generic browsing is a poor interface for disclosure research:

- agents spend too many steps navigating filters, popups, and viewers
- answers are harder to verify without stable filing and section references
- repeated lookups are slow and brittle
- the DART viewer exposes useful structure, but not in an agent-friendly contract

This is worth standardizing because DART work is repetitive, citation-sensitive, and driven by a few recurring workflows.

## Product Shape

The accepted rewrite target has three public surfaces over one Rust-owned DART
implementation:

- a Rust SDK;
- a Node SDK exposed through a narrow asynchronous Node-API binding; and
- a separate Rust `darty` executable built with `clap`, depending on the Rust
  SDK and preserving the current CLI v1 process contract.

The Rust implementation owns DART request construction, transport policy,
bounds, parsing, domain normalization, and source failures. The Node binding
owns only cross-runtime translation and Node ergonomics. The Rust CLI owns
argument parsing, help, validation presentation, stdout, stderr, and exit
behavior while reusing the SDK instead of becoming a second DART
implementation.

Public GitHub Releases own the versioned standalone CLI archives, checksums,
and installation path. CLI installation requires no Node.js, npm, source
checkout, or language toolchain. All release builds and automated checks run on
Linux; non-Linux binaries are cross-built with their runtime verification limits
made explicit. Distribution of the Node SDK is separate from CLI installation;
the [release runbook](docs/release.md) owns SDK artifacts and installation.
npm registry delivery is not an accepted requirement.

Pi adapters, MCP servers, runtime-specific toolsets, and a
`@sjunepark/darty/toolset` compatibility surface are not target products.

The product should eventually support a narrow set of agent-facing capabilities:

- mimic the integrated filing search surface at `dsab007/main.do`
- search filings by body content
- search filings by company and date window
- list filings for a company or time window
- fetch filing metadata and source links
- list documents or sections within a filing
- fetch a document section with stable references
- bridge filing metadata, viewer sections, PDF downloads, and XBRL when that mapping is reliable

## Principles

- `reference first`: every returned item should be easy to cite and revisit
- `discovery and retrieval`: search alone is not enough
- `structured over prose`: return typed records, not generated explanations
- `source-explicit`: state whether a result came from DART search HTML, viewer HTML, RSS, or a fallback
- `dart-shaped first`: keep low-level DART search details explicit before adding higher-level wrappers
- `one conformer`: keep DART wire behavior in the Rust SDK and expose it through the Node SDK and separate Rust CLI without a second protocol implementation
- `CLI-stable`: preserve the discoverable CLI v1 subprocess contract across the rewrite
- `SDK-idiomatic`: let Rust and Node callers use language-appropriate APIs while sharing operation semantics, identifiers, references, and failures
- `standalone installation`: keep CLI delivery independent of Node/npm and share
  one versioned GitHub Release authority across any future SDK projection
- `public-read first`: v1 should target read-only access

## v1 Boundaries

### In Scope

- read-only search and retrieval
- stable references to companies, filings, documents, and sections where possible
- enough metadata to verify origin, completeness, and source URL
- one Rust-owned capability implementation that backs the Rust SDK, Node SDK, and CLI

### Out Of Scope

- answer generation inside the tool
- mutation, submission, login automation, or account workflows
- legal, accounting, or investment advice
- broad abstraction across unrelated regulatory systems
- premature support for every DART sub-surface

## Expected Output Shape

Operations should converge on a shared envelope with:

- `result`: operation payload
- `metadata`: source, timing, version, completeness notes
- `references`: company code, filing number, document number, section pointer, source URL
- `warnings`: partial matches, parsing uncertainty, source drift, auth gaps
- `error`: typed failure with retry or fallback hints

## Success Criteria

The product is successful when an agent can reliably:

- find the filing most relevant to a company and date window
- retrieve the exact document or section needed for an answer
- cite the filing and section reference in its output
- compare related filings with low tool-call overhead

The rewrite is successful when the same supported operations are also usable
through idiomatic Rust and Node SDKs, the CLI v1 contract remains compatible,
and no superseded TypeScript DART implementation or toolset surface remains.
