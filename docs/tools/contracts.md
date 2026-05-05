# Contracts

## Goal

A tool contract should make invalid usage hard and useful usage obvious.

This document covers single-tool interface design. For conventions shared across many tools, see [portfolio.md](portfolio.md).

## Input Design

Prefer inputs that are:

- `semantic`
  Use fields like `companyName`, `companyCode`, `filingDateRange`, `reportName`, or `sectionQuery` instead of one overloaded free-form string. Match the public contract's naming style; keep raw source names in adapter internals.
- `bounded`
  Include scope, limits, offsets, and modes.
- `composable`
  Support filtering and pagination instead of one monolithic request.
- `safe`
  Separate read-only operations from mutating or destructive ones.

Avoid:

- catch-all `query` parameters when a structured form exists
- mode switches that completely change the result shape
- hidden defaults that affect correctness
- raw text prompts as the primary interface for deterministic work

## DART Search Keyword Syntax

DART search keyword fields should preserve DART's official common search syntax unless a specific upstream surface proves otherwise. Tool descriptions should mention this syntax when they expose a DART keyword field:

- AND condition (`공백`, space): `사과 포도` searches for documents where both `사과` and `포도` exist.
- OR condition (`|`): `사과|포도` searches for documents where either `사과` or `포도` exists.
- NOT condition (`!`): `사과!포도` excludes documents containing `포도` from results for `사과`.
- EXACT condition (`" "`): `"사과 포도"` searches for a word/phrase made exactly of `사과포도` or `사과 포도` in that order; no other word or phrase may appear between `사과` and `포도`.

Keep this as user-facing search syntax, not a license to collapse structured filters into one broad query string.

## Output Design

Most tools benefit from a consistent outer envelope:

- `result`
  The structured payload the next step consumes.
- `metadata`
  Source, timing, version, partial flags, cache info.
- `references`
  Filing ids, document ids, section ids, URLs, page numbers, and related pointers.
- `warnings`
  Partial coverage, auth gaps, source drift, fallback use, parsing uncertainty.
- `error`
  Typed code, message, retryability, suggested next action.

Keep the envelope consistent. Let the domain payload vary by tool family.

## Output Modes

Many tools should expose:

- `summary`
  Small, agent-readable synthesis
- `structured`
  Schema-first payload for downstream steps
- `raw`
  Original HTML, XML, text, or source fragments when needed

This avoids the false choice between "too abstract" and "too verbose."

## Error Model

Treat errors as part of the product.

Useful error categories:

- `invalid_input`
- `not_found`
- `unauthorized`
- `rate_limited`
- `source_unavailable`
- `source_changed`
- `partial_retrieval` for broad partial-result failures; individual tools may use narrower warning codes such as `partial_rows_dropped`
- `unsupported_surface`
- `internal_failure`

Each error should say:

- whether retrying may help
- whether the input should change
- whether the upstream source changed
- what fallback path exists

## References

Traceability is a core contract feature, not optional metadata.

Examples:

- filing search: public fields such as `receiptNumber`, `companyCode`, `reportTitle`, `receiptDate`; source fields such as `rcpNo`, `corpCik`, or `rcept_dt` only when preserving source evidence matters
- viewer section: `receiptNumber`, `documentNumber`, `eleId`, `tocNo`, source URL
- PDF: `receiptNumber`, `documentNumber`, download URL
- XBRL: `receiptNumber`, statement type, source URL

Without stable references, agents cannot verify, quote, or recover reliably.
