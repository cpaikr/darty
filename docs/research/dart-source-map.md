# DART Source Map

Captured on 2026-03-31.

Method:

- inspected the live home page and search page in a browser session
- replayed representative pages with `curl`
- inspected the report viewer HTML and embedded viewer state
- replayed direct POST requests to `/dsab007/search.ax`

This document records source evidence for the DART site. It is not yet the public tool spec.

## Surface Map

### Main DART Site

- Browser origin: `https://dart.fss.or.kr/`
- Home page title observed: `전자공시시스템`
- Main search page observed: `https://dart.fss.or.kr/dsab007/main.do?option=corp`
- Report viewer observed: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcpNo}`

Current project decision:

- v1 targets `dart.fss.or.kr` directly
- v1 does not use the official OpenDART API

## Observed UI And Route Responsibilities

- `/`
  Landing page with recent disclosures, company search, and nav links into the major DART modules.
- `/dsab007/main.do?option=corp`
  Integrated filing search page with selectable modes:
  company name, report name, report table of contents name, body content, and advanced search.
- `/dsaf001/main.do?rcpNo={rcpNo}`
  Filing report viewer with embedded table-of-contents state and iframe-based section loading.
- `/dsae001/selectPopup.ax`
  Company info popup endpoint referenced by the home page source.
- `/pdf/download/main.do?rcp_no={rcpNo}&dcm_no={dcmNo}`
  PDF download endpoint referenced by the report viewer source.
- `/dsaf002/main.do?rcpNo={rcpNo}[&dcmNo={dcmNo}]`
  XBRL preview route referenced by the report viewer source.

## Report Viewer Identifier Spaces

Observed in the HTML for `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166`.

- `rcpNo`
  Filing receipt number. Example: `20260331004166`.
- `dcmNo`
  Document number inside the filing. Example: `11213016`.
- `eleId`
  Element id used for section targeting inside the document tree. Example: `1`, `17`, `53`.
- `offset`
  Byte or character offset used by `/report/viewer.do`. Example: `972`, `124828`.
- `length`
  Span length paired with `offset`. Example: `4495`, `328537`.
- `tocNo`
  Viewer table-of-contents sequence number.
- `atocId`
  Alternate or editor-side TOC id. The source explicitly notes that `eleId` and `tocNo` are not always identical.
- `dtd`
  Viewer document type descriptor. Example: `dart4.xsd`.

Important finding:

- The viewer already exposes a rich section-addressing model.
- That is promising for deterministic retrieval, but it is too low-level to expose blindly as the public contract.

## Report Viewer Behavior

Observed in the viewer HTML source:

- the page embeds a full `treeData` structure for the filing TOC
- selecting a TOC node calls `viewDoc(...)` or `linkDoc(...)`
- `viewDoc(...)` builds a request to `/report/viewer.do`
- the request is parameterized by `rcpNo`, `dcmNo`, `eleId`, `offset`, and `length`
- the viewer can also open PDF download and XBRL flows from the same filing context

This suggests that section retrieval may be possible without full browser automation once the request model is confirmed.

## Search Surface Notes

Observed from the live body-content search page, page source, and direct POST replay:

- the integrated filing search page is HTML-driven, not a public JSON API
- search modes include company, report name, TOC name, body content, and advanced search
- the page exposes date-range filters, final-report filtering, and multiple find-popup flows
- the home page references classic `.do` and `.ax` module routes rather than one clean API surface
- direct POST to `/dsab007/search.ax` works without an authenticated browser session in tested cases
- `/dsab007/search.ax` returns an HTML fragment containing:
  result count, sort links, result rows, `totalCnt`, and pagination markup

Observed replay payload shape for `option=contents`:

- `currentPage`, `maxResults`, `maxLinks`
- `sort`, `sortType`
- `option=contents`
- `keyword`
- `startDate`, `endDate`
- duplicated or replay-only fields such as `b_keyword`, `b_startDate`, `b_endDate`
- optional company and presenter fields such as `textCrpCik`, `textCrpNm`, `textPresenterNm`

Observed replay result shape:

- `검색건수 : N`
- filing rows with company badge, company name, filing link, snippet, info tags, and filing date
- filing links like `/dsaf001/main.do?rcpNo={rcpNo}&dcmNo={dcmNo}&keyword={keyword}`
- `totalCnt` as a hidden input
- pagination like `[1/4] [총 32건]`

Observed pagination constraint:

- live validation on 2026-03-31 suggests `maxResults` is not a stable public control for `option=contents`
- replayed requests with `maxResults=2` still returned 10 rows and page counts consistent with 10-row paging
- treat page size as upstream-controlled for now

Observed no-result behavior:

- `검색건수 : 0`
- table body containing `조회 결과가 없습니다.`
- on 2026-03-31, the placeholder appeared as a bare `td colspan="3">조회 결과가 없습니다.</td>` directly under `tbody`
- on 2026-03-31, the no-result fragment omitted the `.pageInfo` pagination block entirely

Current implication:

- body-content search is replayable today without browser automation
- the response still needs HTML parsing, but the implementation should keep `dsab007` field semantics explicit instead of normalizing too early
- v1 should start with one mode, but under a shared `dsab007` search core rather than a one-off body-search module

## Adjacent Feeds And Supporting Surfaces

Observed in the report viewer source:

- `https://dart.fss.or.kr/api/todayRSS.xml`
- `https://dart.fss.or.kr/api/companyRSS.xml?crpCd={companyCode}`

These may be useful for lightweight feed operations, but they are supporting surfaces, not yet the primary contract.

## Current v1 Recommendation

Treat body-content search as the first-class v1 entrypoint:

- public ids should prefer filing identifiers and search inputs that survive UI changes
- section byte ranges and low-level viewer offsets should stay internal unless proven necessary
- keep search and retrieval separate
- keep XBRL as an explicit extension point, not an assumed v1 dependency

## Immediate Follow-Ups

- confirm what request shape `/report/viewer.do` accepts directly and what it returns
- classify which `/dsab007/search.ax` fields are public inputs versus replay-only noise
- define the parsed result row model for the tool contract
- choose whether v1 section retrieval starts at full filing documents or specific TOC sections
