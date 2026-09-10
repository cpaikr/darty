---
name: darty
description: "Search Korean DART disclosures and retrieve verifiable company, filing, and report-section evidence with the Darty CLI. Explicit invocation only. Use for CLI consumer tasks; excludes SDK integration and Darty development."
---

# Darty

Turn a disclosure research request into bounded CLI queries and evidence from
the relevant filing. Darty reads public DART web pages; it does not use the
official OpenDART API or require an OpenDART API key.
Requires a shell that can run Darty; live retrieval needs access to
`dart.fss.or.kr`.

## Start with the available executable

Reuse a successful Darty check from this execution context. Otherwise run
`darty --help` once; `--version` is not part of the CLI v1 contract. Recheck
after an executable/environment change or a relevant failure.

- If missing, unusable, or setup/upgrade is requested, read
  [installation](references/installation.md). A provider error or an unsupported
  option alone is not an installation failure.
- For searches or retrieval, read [usage](references/usage.md), then the chosen
  command's `--help`. Use installed help for exact syntax; do not assume a
  checkout-only feature is released. Load only the relevant command help.

## Choose the shortest route

| User needs | Route |
| --- | --- |
| Company identity or profile | `search-company` → `company-detail` when needed |
| A company's filings in a period | `search-company-reports` with its returned DART company code |
| Filings mentioning a topic | `search-body` → `view-report` to verify context |
| Evidence from a known filing or viewer URL | `view-report` → selected document/section |
| Which report family or disclosure code to use | `report-guide` or `disclosure-types` |
| Recent company feed items | `company-rss`; use filing search for date-bounded history |

Use explicit date windows and returned identifiers. An 8-digit DART
`companyCode` differs from a 6-digit stock code. Resolve an ambiguous company
before attributing filings. A search snippet is candidate evidence; read the
actual section before asserting what a report says.

## Interpret the process and finish the task

Capture exit status and stdout separately from stderr. Capability commands
return one JSON envelope on success (exit 0) and failure (exit 1); inspect
`result`, `metadata`, `references`, `warnings`, and any `error` or `help`.
Help and successful `report-guide` are text. Bare `darty` returns JSON home
information. Use `--agent` only on commands whose help supports it.

On failure, retain the error code, source URL, retryability, and recovery hint.
Correct invalid input using command help. For stale report IDs, refresh that
report's TOC. For a retryable source failure, retry once; if it persists, report
the blocked coverage. Treat parse/source-change failures as uncertainty, not
empty search results. Do not silently substitute a different company, date
range, or source to manufacture an answer.

Finish with the requested findings or artifact and the operation's returned
identifiers and provenance. For filing findings, identify the company, filing
title/date, receipt number, and returned DART source URL; for body claims, add
the document/section title and returned locator. Company profiles and static
lookups are complete with their own fields and provenance; no filing search is
needed. State material warnings, pages or content windows left unread, and any
unresolved ambiguity.
Separate report evidence from interpretation; successful execution alone does
not establish complete coverage or substantiate an accounting, legal, or
investment conclusion.
