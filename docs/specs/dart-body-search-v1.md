# DART Body Search v1

## 1. Identity

- `name`: `dart-body-search-v1`
- `owner`: `darty`
- `status`: draft
- `domain`: DART filing body-content search and follow-on filing retrieval
- `users`: LLM agents and scripts that need body-content search over DART filings

## 2. Problem

- User task:
  search DART filings by body text, then open the matching filing or follow-on section without browser automation.
- Generic tools are insufficient because:
  the DART flow is HTML-driven, parameter-heavy, and split between search results and the report viewer.
- This capability is worth standardizing because:
  `본문내용` search is one of the most useful DART features and is not covered well by the official API.

## 3. Capability Boundary

The first tool should:

- replay `공시통합검색 > 본문내용` against `/dsab007/search.ax`
- parse the returned HTML fragment into structured search results
- return filing identifiers needed for later retrieval
- optionally expose a follow-on filing open URL

The first tool should not yet:

- expose every DART search mode
- expose raw DART form fields one-for-one unless they are necessary
- expose TOC-aware section retrieval
- handle authenticated or mutating flows

## 4. Domain Model

### Primary entities

- `body_search_query`
  The semantic search request.
- `filing_search_hit`
  One filing returned by body-content search.
- `filing_reference`
  Stable filing-level reference built around `rcpNo` and usually `dcmNo`.

### Stable identifiers

- `rcpNo`
  Filing receipt number. Public id candidate.
- `dcmNo`
  Filing document number from the result-row viewer link. Public id candidate for filing retrieval.
- `corpCik`
  Company identifier visible in company popup links. Public id candidate, but still needs naming confirmation.

### Deferred identifiers for later retrieval

- `eleId`
- `offset`
- `length`
- `tocNo`
- `atocId`

These appear in the viewer contract, not the first search-result contract.

## 5. Proposed Operations

### `search_filing_bodies`

- `purpose`
  Search DART filings by body text over a date window.
- `inputs`
  `query`, optional `company`, optional `presenter`, `start_date`, `end_date`, `page`, `sort`
- `output`
  `total_count`, `page`, `page_count`, `returned_count`, `results[]`
- `result item`
  `company_name`, `company_market`, `corp_id`, `report_title`, `report_subtitle`, `rcp_no`, `dcm_no`, `snippet_html`, `snippet_text`, `disclosure_category`, `content_scope`, `presenter_name`, `filed_at`, `viewer_url`
- `error cases`
  `invalid_input`, `source_unavailable`, `source_changed`, `partial_retrieval`
- `safety class`
  read-only

### `get_filing_viewer`

- `purpose`
  Return the filing viewer URL and core filing ids from a search hit.
- `inputs`
  `rcp_no`, optional `dcm_no`, optional `keyword`
- `output`
  `viewer_url`, `references`
- `error cases`
  `invalid_input`, `not_found`
- `safety class`
  read-only

Section retrieval is intentionally deferred to a later spec once the filing-level contract is stable.

## 6. Public Input Model Candidates

Prefer a narrower semantic input model:

- `query`
- `start_date`
- `end_date`
- `page`
- `page_size`
- `sort`
- optional `company_name`
- optional `company_id`
- optional `presenter_name`

Keep these internal unless proven necessary:

- `maxLinks`
- duplicated `b_*` fields
- `isSort`
- `isTab`
- `autoSearch`
- `lateKeyword`
- `reportNamePopYn`

## 7. Output Modes

- `summary`
  compact list of filing hits
- `structured`
  parsed result rows plus references and pagination
- `raw`
  original HTML fragment from `/dsab007/search.ax`

## 8. Observed Upstream Contract

Observed request:

- endpoint: `POST /dsab007/search.ax`
- successful anonymous replay in tested cases
- `option=contents`
- query text supplied at least through `keyword`
- result paging through `currentPage` and `maxResults`

Current implementation note:

- `maxResults` is still sent upstream for replay compatibility
- in live validation on 2026-03-31, DART continued to paginate in groups of 10
- v1 should therefore not promise caller-controlled page size yet

Observed response:

- HTML fragment, not JSON
- count header, sort controls, result table, hidden `totalCnt`, pagination block
- result row viewer link includes `rcpNo`, `dcmNo`, and the original keyword

## 9. Open Questions

- Is `corpCik` the right public company identifier name, or should the tool normalize it under a different field name after more evidence?
- Should `snippet_html` and `snippet_text` both be public, or should one be derived mode-specific output?
