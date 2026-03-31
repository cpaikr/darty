# PDF Tool Playbook

Use [../contracts.md](../contracts.md) for shared contract rules and [../evaluation.md](../evaluation.md) for eval structure. This playbook only covers PDF-specific design choices.

## Goal

Do not expose "download filing PDF" as one vague operation. Split the capability into semantically distinct operations.

## Recommended Operations

- `inspect_pdf`
  Metadata, page count, download origin, and filing references.
- `download_pdf`
  Persist or stream the source PDF with filing references.
- `extract_text`
  Text by page, block, or reading order.
- `extract_tables`
  Table candidates with page and cell references.
- `extract_sections`
  Heading-aware segmentation when possible.

## PDF-Specific Requirements

- `provenance`
  Preserve `rcp_no`, `dcm_no`, page numbers, extraction method, and warnings.
- `targeted access`
  Favor inspect-first and section-first flows over dumping an entire document by default.

## Good Agent-Facing Abstractions

- `download_filing_pdf`
- `extract_section_from_pdf`
- `quote_pdf_text_at_page`
- `list_pages_matching_keywords`

## Hard Cases

- scanned attachments
- broken text ordering
- multi-column layouts
- rotated tables
- amended filings with different document numbering
