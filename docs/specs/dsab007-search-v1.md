# dsab007 Search v1

## 1. Identity

- `name`: `dsab007-search-v1`
- `owner`: `darty`
- `status`: draft
- `domain`: DART integrated filing search through `dsab007`
- `users`: LLM agents and scripts that need direct DART search access without browser automation

## 2. Problem

- User task:
  replay DART integrated filing search modes programmatically, starting with `본문내용`.
- Generic tools are insufficient because:
  the DART flow is HTML-driven, parameter-heavy, and split between search results and the report viewer.
- This capability is worth standardizing because:
  the integrated filing search surface exposes useful workflows that are not covered well by the official API.

## 3. Capability Boundary

The first tool should:

- expose a DART-shaped contract for `dsab007/search.ax`
- share one execution core for `dsab007` mode replays
- parse the returned HTML fragment into structured mode-specific results
- start with `option=contents`
- return filing identifiers needed for later retrieval

The first tool should not yet:

- claim that every `dsab007` mode is already implemented
- expose TOC-aware section retrieval
- handle authenticated or mutating flows

## 4. Domain Model

### Primary entities

- `dsab007_contents_search_input`
  DART-shaped request for the implemented `contents` mode.
- `dsab007_contents_row`
  One parsed search result row returned by the `contents` mode.
- `filing_reference`
  Stable filing-level reference built around `rcpNo` and usually `dcmNo`.

### Stable identifiers

- `rcpNo`
  Filing receipt number.
- `dcmNo`
  Filing document number from the result-row viewer link.
- `corpCik`
  Company identifier visible in company popup links.

### Deferred identifiers for later retrieval

- `eleId`
- `offset`
- `length`
- `tocNo`
- `atocId`

These appear in the viewer contract, not the first search-result contract.

## 5. Proposed Operations

### `search_dsab007_contents`

- `purpose`
  Replay `dsab007` contents search with explicit DART-shaped request fields.
- `inputs`
  `option`, `currentPage`, `maxResults`, `maxLinks`, `sort`, `sortType`, `keyword`, `startDate`, `endDate`, and optional known `dsab007` contents fields
- `output`
  `request`, `pagination`, `rows[]`
- `result item`
  `companyName`, `companyMarketLabel`, `corpCik`, `reportNameRaw`, `reportModifier`, `reportTitle`, `reportPeriod`, `reportNameSuffix`, `rcpNo`, `dcmNo`, `snippetHtml`, `snippetText`, `disclosureTypeLabel`, `contentTypeLabel`, `presenterName`, `receiptDate`, `rawInfoText`, `viewerPath`, `viewerUrl`
- `error cases`
  `invalid_input`, `source_unavailable`, `source_changed`, `partial_retrieval`
- `safety class`
  read-only

### `get_filing_viewer`

- `purpose`
  Return the filing viewer URL and core filing ids from a parsed search row.
- `inputs`
  `rcpNo`, optional `dcmNo`, optional `keyword`
- `output`
  `viewerUrl`, `references`
- `error cases`
  `invalid_input`, `not_found`
- `safety class`
  read-only

Section retrieval is intentionally deferred to a later spec once the filing-level contract is stable.

## 6. Current Contract Stance

Prefer an explicit DART-shaped layer first:

- `currentPage`
- `maxResults`
- `maxLinks`
- `sort`
- `sortType`
- `keyword`
- `startDate`
- `endDate`
- optional `textCrpCik`
- optional `textCrpNm`
- optional `textPresenterNm`
- optional mode-known fields such as `docType`, `reportName`, `tocSrch`

Keep these replay helpers internal unless proven necessary:

- duplicated `b_*` fields
- `isSort`
- `isTab`
- `autoSearch`
- `reportNamePopYn`

## 7. Output Modes

- `structured`
  parsed mode-specific rows plus references and pagination
- `raw`
  original HTML fragment from `/dsab007/search.ax`

## 8. Observed Upstream Contract

Observed request:

- endpoint: `POST /dsab007/search.ax`
- successful anonymous replay in tested cases
- `option=contents` is the first implemented mode
- request fields mirror DART names more closely than the first semantic prototype did
- result paging through `currentPage` and `maxResults`

Current implementation note:

- live validation on 2026-03-31 still suggests DART may ignore caller-controlled `maxResults`
- the low-level contract should expose the field anyway, but callers must not assume the site honors it

Observed response:

- HTML fragment, not JSON
- count header, sort controls, result table, hidden `totalCnt`, pagination block
- result row viewer link includes `rcpNo`, `dcmNo`, and the original keyword
- attachment rows require preserving more of the raw report-name structure than a simple title/subtitle split
- no-result responses may omit the pagination block entirely and currently render `조회 결과가 없습니다.` as a bare `td[colspan]` placeholder under `tbody`

## 9. Open Questions

- Which `dsab007` mode should be implemented second?
- How much of the low-level DART request shape should remain public once a semantic wrapper layer exists?
