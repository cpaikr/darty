# System Overview

`darty` turns selected DART web search behavior into structured, read-only tool calls. It exists because DART research is repetitive, citation-sensitive, and awkward for agents to perform through browser navigation alone.

## What Exists Today

The executable slice is intentionally narrow:

- public CLI commands and a trusted-host JS/TS toolset for company search/detail/RSS, filing search, body search, disclosure-type discovery, report guidance, and report viewing
- DART source adapters for `dsab007`, `dsae001`, company RSS, and `dsaf001` report viewing
- structured result envelopes with request echo, metadata, references, and warnings
- deterministic tests plus opt-in live and agentic CLI eval tracks

The broader product direction is in [VISION](../../VISION.md). Do not infer the full product scope from the current capabilities; the repo explicitly treats current code as the first slice of a larger DART querying/searching tool.

## Why The CLI Is Still The Default Surface

A common first impression is that this is only command-line argument parsing around DART. The architecture is different: reusable capability code owns semantic behavior, while the CLI and trusted-host toolset are thin public adapters over that core.

```text
                 +-------------------+
                 | capability core   |
                 +---------+---------+
                           |
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
   +-------------+                  +---------------+
   | CLI adapter |                  | toolset export |
   | user flags  |                  | server hosts   |
   +-------------+                  +---------------+
```

This keeps semantic behavior in the shared capability layer. Use the CLI for humans, subprocess agents, and desktop process boundaries; use `@sjunepark/darty/toolset` only for trusted JS/TS server hosts.

## Current Product Shape

The current public operations search filing body content, find companies, list company filings, fetch company detail/RSS data, discover disclosure types, print a report-family guide, and retrieve report document/section content by receipt. They return structured results, not generated explanations.

A successful result is shaped for downstream verification:

- `result.request`: normalized request with defaults applied
- `result.pagination`: current page, total pages, total count, returned count
- `result.items`: company, filing, match, reference, and evidence fields
- `metadata`: source endpoint, fetch timing, completeness, observed source behavior
- `references`: source search URL
- `warnings`: partial parsing warnings such as dropped rows

This reflects the repo's `reference first` principle: each item should be easy to cite, revisit, or use as input to later retrieval work.

## Important Constraints

- The tool is read-only.
- DART is an external HTML source, so parser and source-contract drift are real risks.
- Public inputs stay semantic. Low-level DART form fields remain inside the adapter unless proven stable enough to expose.
- PDF handling, XBRL, and broader filing search surfaces are product directions, not current public capability behavior.

## Canonical Sources

Use this page for orientation only. For current behavior, read:

- [README](../../README.md) for public command usage
- [VISION](../../VISION.md) for product direction and non-goals
- [ARCHITECTURE](../../ARCHITECTURE.md) and [src/ARCHITECTURE](../../src/ARCHITECTURE.md) for ownership and implementation invariants
- [dsab007 search spec](../specs/dsab007-search-v1.md) for the current draft contract stance
- [source map](../research/dart-source-map.md) for observed DART evidence
