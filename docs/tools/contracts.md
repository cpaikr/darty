# Contracts

## Goal

A tool contract should make invalid usage hard and useful usage obvious.

This document covers single-tool interface design. For conventions shared across many tools, see [portfolio.md](portfolio.md).

## Input Design

Prefer inputs that are:

- `semantic`
  Use fields like `company_name`, `corp_code`, `filing_date_range`, `report_name`, or `section_query` instead of one overloaded free-form string.
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
- `partial_retrieval`
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

- filing search: `rcp_no`, `corp_code`, `report_nm`, `rcept_dt`
- viewer section: `rcp_no`, `dcm_no`, `ele_id`, `toc_no`, source URL
- PDF: `rcp_no`, `dcm_no`, download URL
- XBRL: `rcp_no`, statement type, source URL

Without stable references, agents cannot verify, quote, or recover reliably.
