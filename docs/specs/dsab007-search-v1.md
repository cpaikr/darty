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

- expose a semantic capability contract for contents search
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

- `contents_search_input`
  Semantic request for the public `contents-search` capability.
- `source_contents_replay_input`
  Internal DART replay request for the implemented `contents` mode.
- `contents_row`
  One public search item returned by the capability.
- `source_contents_row`
  One parsed DART source row before public result mapping.
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

### `search_contents`

- `purpose`
  Search DART filing contents through a semantic capability backed by an internal `dsab007` replay adapter.
- `inputs`
  `page`, `sortBy`, `sortDirection`, `keyword`, `startDate`, `endDate`, and optional stable filters such as `companyCode`, `presenterName`, and `reportName`
- `output`
  `result`, `metadata`, `references`, `warnings`
- `result item`
  stable company, filing, match, reference, and evidence fields derived from parsed DART rows
- `error cases`
  `invalid_request`, `source_unavailable`, `source_changed`, `source_parse_failure`, `internal_error`
- `warning cases`
  `partial_retrieval`
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

Public external inputs should stay semantic:

- `page`
- `sortBy`
- `sortDirection`
- `keyword`
- `startDate`
- `endDate`
- optional `companyCode`
- optional `presenterName`
- optional `reportName`

Keep the low-level DART replay layer internal:

- `option`
- `currentPage`
- `maxResults`
- `maxLinks`
- `sort`
- `sortType`
- `keyword`
- `startDate`
- `endDate`
- optional `textCrpCik`
- optional `textPresenterNm`
- optional `reportName`

Status labels used in this spec and in the contract tests:

- `observed`
  direct live evidence confirms the field shape or behavior
- `inferred`
  the field appears in replay/source inspection but is not yet proven stable live
- `unverified`
  the field is named or suspected but still lacks stable evidence

Keep these replay helpers internal unless proven necessary:

- duplicated `b_*` fields
- `isSort`
- `isTab`
- `autoSearch`
- `reportNamePopYn`

Observed `option=contents` restriction:

- `sort` is currently limited to `DATE | rpt_nm`
- `sortType` is currently limited to `asc | desc`

## 7. Output Modes

- `structured`
  capability-owned result envelope with public items, metadata, references, and warnings
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
- the replay adapter should expose the field internally, but the public capability should not present it as a stable caller-controlled input
- live validation on 2026-04-01 still shows `maxLinks` being accepted but ignored for `option=contents`
- the public capability should treat page size and pager width as upstream-controlled for now
- live validation on 2026-04-01 shows `textCrpCik`, `textPresenterNm`, and `reportName` affecting results, while `textCrpNm` is currently accepted but ignored for the replay shape used here
- the capability should depend on a capability-owned provider result, not on parsed DART source pages directly
- provider-specific source failures should be normalized into capability-owned provider errors before they reach capability execution

Observed response:

- HTML fragment, not JSON
- count header, sort controls, result table, hidden `totalCnt`, pagination block
- result row viewer link includes `rcpNo`, `dcmNo`, and the original keyword
- attachment rows require preserving more of the raw report-name structure than a simple title/subtitle split
- no-result responses may omit the pagination block entirely and currently render `조회 결과가 없습니다.` as a bare `td[colspan]` placeholder under `tbody`

## 9. Open Questions

- Which `dsab007` mode should be implemented second?
- Which additional filters, if any, deserve promotion from the replay adapter into the stable public capability contract?
