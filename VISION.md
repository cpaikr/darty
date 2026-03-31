# DART Access Tool Vision

## Product

- `name`: `darty`
- `status`: vision
- `domain`: Korean corporate disclosures, filing metadata, and document sections from DART
- `users`: LLM agents, agent developers, investors, researchers, and internal automation that need reliable DART access

## Goal

Build a tool that gives agents a stable, programmatic way to search and retrieve filing data from `https://dart.fss.or.kr/`.

The target experience should be closer to `yfinance` than browser automation:

- small semantic operations
- predictable structured results
- stable identifiers and references
- easy local scripting for humans
- easy wrapping for MCP later

## Why This Exists

Generic browsing is a poor interface for disclosure research:

- agents spend too many steps navigating filters, popups, and viewers
- answers are harder to verify without stable filing and section references
- repeated lookups are slow and brittle
- the DART viewer exposes useful structure, but not in an agent-friendly contract

This is worth standardizing because DART work is repetitive, citation-sensitive, and driven by a few recurring workflows.

## Product Shape

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
- `transport-light`: start with a reusable core and a CLI; add MCP later if justified
- `public-read first`: v1 should target read-only access

## v1 Boundaries

### In Scope

- read-only search and retrieval
- stable references to companies, filings, documents, and sections where possible
- enough metadata to verify origin, completeness, and source URL
- a core capability that can later back a CLI, Python package, and MCP adapter

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

## Open Questions

These belong to investigation, not the vision:

- how closely the public search contract should mirror DART's native search form
- which identifier mapping is stable enough for public contracts
- how much of the report viewer can be accessed cleanly without browser automation
- whether financial statement and XBRL retrieval belong in v1 or a later phase
