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

## 4. Implemented Korean UI Slice

This spec is aligned to the live Korean DART UI, but only up to the behavior currently implemented.

Observed UI entrypoint:

- `공시서류검색 > 공시통합검색`
- URL: `https://dart.fss.or.kr/dsab007/main.do?option=corp`
- implemented mode after changing the search selector: `본문내용` (`option=contents`)

Implemented input mapping:

| Korean DART UI | Public input | Internal `/dsab007/search.ax` replay field | Status |
|---|---|---|---|
| search selector `본문내용` | fixed capability choice | `option=contents` | implemented; not caller-configurable |
| `본문내용 입력` | `keyword` | `keyword`, `b_keyword` | implemented and required |
| `검색시작일` | `startDate` | `startDate`, `b_startDate` | implemented and required |
| `검색종료일` | `endDate` | `endDate`, `b_endDate` | implemented and required |
| result page | `page` | `currentPage` | implemented; default `1` |
| result sort `접수일자` | `sortBy=date` | `sort=DATE` | implemented; default |
| result sort `보고서명` | `sortBy=reportName` | `sort=rpt_nm` | implemented |
| sort direction `오름차순` / `내림차순` | `sortDirection=asc|desc` | `sortType=asc|desc` | implemented; default `desc` |
| `회사명/종목코드 입력` after company lookup | `companyCode` | `textCrpCik`, `b_textCrpCik` | implemented only for the hidden company code value, not free-text company name |
| `제출인명 입력` | `presenterName` | `textPresenterNm`, `b_textPresenterNm` | implemented |
| `보고서명 입력` | `reportName` | `reportName`, `b_reportName` | implemented |

Implemented output mapping:

| Korean DART result UI | Public result field |
|---|---|
| `검색건수` / `[총 N건]` | `result.pagination.totalCount` |
| pager `[현재/전체]` | `result.pagination.currentPage`, `result.pagination.totalPages` |
| company badge and company link | `item.company.marketLabel`, `item.company.name`, `item.company.companyCode` |
| report link | `item.filing.receiptNumber`, `item.filing.documentNumber`, `item.references.viewerUrl` |
| report title text | `item.filing.reportTitle`, modifier/period/suffix fields when parsed |
| body hit snippet | `item.match.snippetText`, `item.evidence.snippetHtml` |
| `[공시유형] [본문|첨부문서] 제출인 : ...` | `item.match.disclosureTypeLabel`, `contentTypeLabel`, `presenterName`, plus `evidence.rawInfoText` |
| receipt date | `item.filing.receiptDate` |

Observed but not implemented from the Korean UI:

- other search modes: `전체`, `회사명`, `보고서명`, `보고서 목차명`, `고급검색`
- free-text company-name replay through `textCrpNm`; tested as accepted but ignored for the current replay shape
- `동의어`
- `문서유형` (`전체`, `본문`, `첨부문서`)
- `공시유형` checkbox filtering
- quick date buttons and `기간더보기`; callers provide explicit dates instead
- page-size dropdown (`15`, `30`, `50`, `100`); live probes show page size is accepted but not caller-controlled for `option=contents`
- popup automation for `찾기`, autocomplete, recent-search, reset, and help flows
- filing viewer or section retrieval after clicking a result

### Official Guide Source For Descriptions

Use the official DART guide as the source for Korean UI explanations and future tool-description copy:

- `https://dart.fss.or.kr/guide/main.jsp?menu=122`
- guide title: `공시 서류 검색 – 공시통합검색`

The guide is broader than this spec. It explains all integrated-search modes and many UI controls that are not implemented here. It should be used to understand user-facing labels, concepts, examples, and wording, but it is not itself the replay API contract.

For the currently implemented `본문내용` slice, guide-backed description details that are safe to mention in tool/help copy:

- `본문내용` searches within submitted disclosure document contents.
- The keyword field supports DART's documented common search syntax because the tool passes the keyword through to DART:
  - AND condition (`공백`, space): `사과 포도` searches for documents where both `사과` and `포도` exist.
  - OR condition (`|`): `사과|포도` searches for documents where either `사과` or `포도` exists.
  - NOT condition (`!`): `사과!포도` excludes documents containing `포도` from results for `사과`.
  - EXACT condition (`" "`): `"사과 포도"` searches for a word/phrase made exactly of `사과포도` or `사과 포도` in that order; no other word or phrase may appear between `사과` and `포도`.
- Date fields correspond to the guide's search-period inputs; the tool requires explicit `YYYYMMDD` dates instead of modeling quick date buttons.
- `presenterName` maps to the guide's `제출인명` concept, used when the filing presenter can differ from the target company.
- `reportName` maps to the guide's `보고서명` narrowing field.

Guide-backed details that must stay out of the public contract until implemented and tested:

- synonym expansion (`동의어`)
- document target (`본문` vs `첨부문서`)
- disclosure-type filtering
- page-size control
- popup selection flows
- non-contents search modes

## 5. Domain Model

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

## 6. Proposed Operations

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
  `partial_rows_dropped` when the parser drops incomplete result rows from an otherwise successful response
- `safety class`
  read-only

### Deferred: `get_filing_viewer`

A separate viewer operation is not implemented in the current v1 slice. For now, each `search_contents` result item includes `references.viewerUrl` plus filing identifiers such as `receiptNumber` and optional `documentNumber`.

Section retrieval and standalone viewer lookup are intentionally deferred to a later spec once the filing-level contract is stable.

## 7. Current Contract Stance

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

## 8. Output Modes

- `structured`
  capability-owned result envelope with public items, metadata, references, and warnings

`raw` HTML from `/dsab007/search.ax` stays internal for fixtures, debugging, and parser tests. It is not exposed by the current public CLI or MCP contract.

## 9. Observed Upstream Contract

Observed request:

- endpoint: `POST /dsab007/search.ax`
- successful anonymous replay in tested cases
- `option=contents` is the first implemented mode
- request fields mirror DART names more closely than the first semantic prototype did
- result paging through `currentPage`; page size is currently upstream-controlled even though `maxResults` is accepted in the replay payload

Current implementation note:

- live validation on 2026-03-31 and replay-contract probes show `maxResults` is accepted but ignored for tested values
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

## 10. Open Questions

- Which `dsab007` mode should be implemented second?
- Which additional filters, if any, deserve promotion from the replay adapter into the stable public capability contract?
