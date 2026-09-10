# Search and retrieve evidence

Read the relevant section below and use `darty <command> --help` for exact
options supported by the installed executable. This workflow targets CLI
transport v1; help and returned fields resolve version-specific differences.

## Resolve the company and filing scope

Search a company name with `search-company`; compare returned names and stock
codes where present before using the 8-digit `companyCode`. Preserve leading
zeros. A stock code is not an interchangeable identifier. Use `company-detail`
when the request needs the company profile or identity needs more evidence.

Use `search-company-reports` for filings by company and receipt-date window.
Dates are `YYYYMMDD`; a reporting period in a title is different from a filing's
receipt date. For example, a report about fiscal 2024 may be filed in 2025.
Choose the filing window accordingly and state assumptions about periods.
Split company-filing searches longer than ten years into supported windows.

Use `report-guide` when the question does not identify a report family, and
`disclosure-types --query <term>` when a detailed disclosure code is needed.
`--report-name` filters titles, not report-body content. Leave unknown industry
codes unfiltered rather than guessing them.

The default company-filing search applies DART's final-report filter. For
correction history or the originally submitted version, use
`--include-all-reports` when supported and inspect the returned filings.
Receipt-date ordering alone does not identify the requested accounting period
or establish that two filings are comparable.

Searches are paginated. Keep filters fixed while following pages and inspect
returned pagination/completeness information. Read as many pages as the task
requires; if a bound stops collection, disclose it. Use supported page sizes
and narrower dates/titles instead of dumping broad searches. `company-rss`
answers recent-feed questions; its items do not establish exhaustive history.
Parsing completeness and pagination are separate: `metadata.completeness`
can be complete while more pages remain, and a final page can have dropped rows.

## Discover topics, then verify their context

`search-body` searches submitted filing text. Quote shell arguments containing
spaces or operators. DART's search grammar is not ordinary literal text:

| Intent | Example argument |
| --- | --- |
| Both terms somewhere in the document | `--keyword '매출 감사'` |
| Either term | `--keyword '매출|수익'` |
| First term excluding the second | `--keyword '매출!수익'` |
| Exact phrase | `--keyword '"핵심감사사항"'` |

A match for both terms does not prove they occur in the same paragraph,
table, or audit matter. Follow the returned receipt number or viewer URL into
`view-report` and inspect the relevant body before making a contextual claim.
Empty successful results mean no matches within the requested filters and
observed coverage, not proof that a topic never appears anywhere in DART.

Prefer compact `--agent` search output when its preserved fields are sufficient.
Its item fields may be flattened, so inspect the actual returned shape instead
of assuming the default nested paths. For parser evidence, omit `--agent` and
use `--verbose` with the supported `--detail`;
`raw` adds operation-specific evidence, not the full original DART source.
Follow returned `help[]` hints only when relevant to the user's task.

## Read a report section and continue long content

1. Pass the returned viewer URL to `view-report` when available, retaining its
   query parameters: `dcmNo` may select the attachment that actually matched.
   Otherwise use the receipt number. Inspect `documents` and `toc` for the
   requested report or attachment.
2. Select the returned `documents[].id` and `toc[].id` for that report. A Darty
   document ID is not DART's `dcmNo`. Retrieve another document's TOC when
   needed, and use its section identifiers.
3. Fetch only the needed section. Discover identifiers anew for each receipt,
   correction, year, or document; matching section titles do not make IDs
   reusable. If an ID fails, refresh the report's document list/TOC.
4. Keep content bounded with `--max-bytes`. When `content.window.hasMore` is
   true and more evidence is needed, pass `content.window.nextStartByte` as
   `--content-start-byte`, keeping receipt, document, section, and output format
   unchanged. Use the returned UTF-8 byte cursor, not character counts or DART
   viewer offsets. If a returned cursor does not advance, stop and report it.

`content.isFullContent` describes the returned body's completeness;
`content.window.hasMore` controls continuation. Do not label a window as the
entire report. `--detail` adds locators; it does not enlarge body content. If
the installed CLI lacks continuation flags, inspect its help for supported
smaller sections or byte limits and disclose the remaining coverage.

Markdown output may retain complex HTML tables. Preserve units, periods,
row/column headers, and rowspan/colspan relationships before extracting values.
Compare the actual requested periods and corresponding sections when reading
multiple filings. Darty does not process PDF bodies internally; use a separate
PDF reader for returned PDF links and identify that source separately.
