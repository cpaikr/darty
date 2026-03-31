# Site Data Tool Playbook

Use [../contracts.md](../contracts.md) for shared contract rules and [../evaluation.md](../evaluation.md) for eval structure. This playbook covers domain-access tools built on top of real site APIs or stable request patterns.

## Goal

When a target site has underlying APIs or stable request patterns, do not make agents browse it like humans. Build a domain access tool instead.

Examples:

- `https://dart.fss.or.kr/`
- `https://opendart.fss.or.kr/`

## Recommended Design Sequence

1. `Investigate the source`
   Reverse engineer network calls, request parameters, response payloads, pagination, auth, identifier schemes, and update cadence.
2. `Define the domain model`
   Model stable concepts such as company, filing, document, section, attachment, and statement.
3. `Define capability operations`
   Expose semantic operations instead of UI-driven flows.
4. `Package for agents`
   Return concise summaries plus structured references rather than raw HTML.

## Example Operations

- `search_companies`
- `search_filings`
- `get_filing`
- `list_filing_documents`
- `get_document_section`
- `get_pdf_download`
- `get_xbrl_entrypoint`

## What To Avoid

- exposing only a generic `search(query)` endpoint
- leaking fragile UI parameters into the public contract without justification
- returning scraped HTML fragments when a cleaner domain object is possible
- forcing the agent to manage pagination manually when the tool can abstract it

## Hard Cases

- undocumented parameters
- mixed HTML and API flows
- identifier mismatches across DART and OpenDART
- filing revisions and corrected reports
- source-side terminology drift
- rate limits or anti-bot behavior
