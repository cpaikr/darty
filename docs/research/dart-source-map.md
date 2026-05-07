# DART Source Map

Initially captured on 2026-03-31. Updated with replay-contract probes on 2026-04-01 and receipt-viewer probes on 2026-05-05.

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
- `/dsab007/detailSearch.ax`
  Integrated filing search fragment endpoint. Observed for `option=corp` company-name filing search; page source indicates `option=report` and `option=reportList` also use this endpoint, but those modes were not replayed in this investigation.
- `/corp/searchCorp.ax`
  Company finder popup endpoint used by integrated search company selection flows.
- `/dsaf001/main.do?rcpNo={rcpNo}`
  Filing report viewer with embedded table-of-contents state and iframe-based section loading.
- `/dsae001/main.do`
  Company overview page with `회사별` and `업종별` search tabs.
- `/dsae001/search.ax`
  Company overview search fragment endpoint used by the `회사별` search tab.
- `/dsae001/select.ax`
  Company overview detail fragment endpoint. It accepts `selectKey={companyCode}`.
- `/api/companyRSS.xml`
  Company-specific disclosure RSS endpoint. It accepts `crpCd={companyCode}`.
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

- the page embeds a full `treeData` structure for the filing TOC when the selected document has section-level TOC data
- selecting a TOC node calls `viewDoc(...)` or `linkDoc(...)`
- `viewDoc(...)` builds a request to `/report/viewer.do`
- the request is parameterized by `rcpNo`, `dcmNo`, `eleId`, `offset`, `length`, and `dtd`
- the viewer can also open PDF download and XBRL flows from the same filing context

Observed receipt-viewing flow on 2026-05-05:

- Entry URL: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcpNo}`.
- A public search result `viewerUrl` and a bare receipt number are equivalent at this entry layer if the caller constructs that URL from `receiptNumber`.
- The entry page is a UTF-8 viewer shell, not the report body. A generic readable-content fetch only returned the shell text and loading state for the seeded `20260331904807` receipt.
- The shell resolves the selected document number (`dcmNo`) and embeds the initial `viewDoc(...)` call.
- The actual rendered report content is loaded into iframe `#ifrm` from `/report/viewer.do`.
- Browser interaction confirmed the same request model: loading `20260331004166` fetched `/report/viewer.do?rcpNo=20260331004166&dcmNo=11213016&eleId=1&offset=972&length=4495&dtd=dart4.xsd`; clicking TOC item `6. 배당에 관한 사항` fetched `/report/viewer.do?rcpNo=20260331004166&dcmNo=11213016&eleId=23&offset=360088&length=13389&dtd=dart4.xsd`.

Observed direct viewer requests:

- For KRX-style HTML receipt `20260331904807`, the shell had no TOC rows (`treeData = []`) and initialized `viewDoc("20260331904807", "11216440", "0", "0", "0", "HTML", "")`.
- `GET /report/viewer.do?rcpNo=20260331904807&dcmNo=11216440&eleId=0&offset=0&length=0&dtd=HTML` returned the full report HTML body with `Content-Type: text/html; charset=MS949`.
- For DART XML-style receipt `20260331004166`, the shell embedded TOC nodes with `text`, `rcpNo`, `dcmNo`, `eleId`, `offset`, `length`, `dtd`, `tocNo`, and `atocId`.
- Its initial section call was `viewDoc("20260331004166", "11213016", "1", "972", "4495", "dart4.xsd", "")`.
- `GET /report/viewer.do?rcpNo=20260331004166&dcmNo=11213016&eleId=1&offset=972&length=4495&dtd=dart4.xsd` returned section HTML with `Content-Type: text/html; charset=utf-8`.
- For that `dart4.xsd` document, omitting section parameters or using `eleId=0&offset=0&length=0` returned an empty body in tested requests.

Observed document selection behavior:

- The `본문` selector values can be just `rcpNo={rcpNo}`; the shell then selects the main body document and resolves its `dcmNo` internally.
- The `첨부` selector values include both `rcpNo={rcpNo}` and `dcmNo={dcmNo}`. Reopening the shell with those parameters selects that attachment and embeds a new TOC/request set for the attachment document.
- The download button calls `/pdf/download/main.do?rcp_no={rcpNo}&dcm_no={dcmNo}` for the currently selected document.

Current implication:

- Receipt rendering can start from public `receiptNumber` by first fetching `/dsaf001/main.do?rcpNo={receiptNumber}` and parsing the selected document context.
- Direct report-body retrieval should use `/report/viewer.do` only after the shell provides `dcmNo`, `dtd`, and, for sectioned documents, the TOC section parameters.
- The implemented `view-report` v1 starts with selected-document discovery, TOC listing, individual section retrieval for TOC-backed documents, and full selected-document retrieval only when DART exposes no TOC. Full-document stitching for TOC-backed documents remains outside the current contract.

## Search Surface Notes

Observed from the live body-content search page, page source, and direct POST replay:

- the integrated filing search page is HTML-driven, not a public JSON API
- search modes include company, report name, TOC name, body content, and advanced search
- the page exposes date-range filters, final-report filtering, and multiple find-popup flows
- the home page references classic `.do` and `.ax` module routes rather than one clean API surface
- direct POST to `/dsab007/search.ax` works without an authenticated browser session in tested cases
- `/dsab007/search.ax` returns an HTML fragment containing:
  result count, sort links, result rows, `totalCnt`, and pagination markup

### Korean Web UI Alignment

Observed again on 2026-05-05 at `https://dart.fss.or.kr/dsab007/main.do?option=corp` and after switching the main search selector to `본문내용`.

The visible page title is `공시통합검색`. The main selector presents these Korean search modes:

- `전체`
- `회사명`
- `보고서명`
- `보고서 목차명`
- `본문내용`
- `고급검색` in the header search selector; the main selector observed for this page exposed the first five modes

The current implementation covers only the `본문내용` mode (`option=contents`). Other modes remain observed UI, not implemented capability.

When `본문내용` is selected, the UI shows these relevant controls:

| Korean UI control | Observed DOM or POST field | Current implementation status |
|---|---|---|
| `본문내용 입력` | visible `contentWord`; submitted as `keyword` and `b_keyword` | implemented as required public `keyword` |
| `동의어` | `synonym` / `b_synonym` style replay field | observed, not implemented |
| `회사명/종목코드 입력` + `찾기` | visible company text; hidden `textCrpCik`; `textCrpNm` also serializes | implemented only as public `companyCode` -> `textCrpCik`; company-name text search is not exposed because tested replay ignored `textCrpNm` |
| `제출인명 입력` + `찾기` | `textPresenterNm` and `b_textPresenterNm` | implemented as optional public `presenterName` |
| `기간` / `검색시작일` / `검색종료일` | `startDate`, `endDate`, plus `b_startDate`, `b_endDate` | implemented as required public `startDate` and `endDate` |
| quick range buttons `1개월`, `6개월`, `1년`, `3년`, `5년`, `10년`, `기간더보기` | UI date helpers and `decadeType` | not modeled; callers send explicit dates |
| `문서유형` (`전체`, `본문`, `첨부문서`) | `docType` and `b_docType` | observed, not implemented |
| `보고서명 입력` + `찾기` | `reportName` and `b_reportName` | implemented as optional public `reportName` |
| `공시유형` checkboxes (`정기공시`, `주요사항보고`, etc.) | `publicType` checkbox values | observed, not implemented |
| result count `검색건수` | `#searchCnt` / hidden `totalCnt` | parsed into `pagination.totalCount` |
| result sort links `접수일자`, `보고서명` | `sort=DATE` or `sort=rpt_nm`; `sortType=asc|desc` | implemented as `sortBy=date|reportName` and `sortDirection=asc|desc` |
| result rows | company badge/name, report link, snippet, `[공시유형] [본문|첨부문서]`, `제출인`, date | parsed into company, filing, match, references, and evidence fields |
| pager `[현재/전체] [총 N건]` | `.pageInfo` | parsed into `pagination.currentPage`, `totalPages`, and `totalCount` |

Observed browser UI serialization for a `본문내용` search on 2026-05-05 included `currentPage=1`, `maxResults=15`, `maxLinks=10`, `sort=DATE`, `sortType=desc`, `option=contents`, `keyword`, `b_keyword`, `startDate`, `b_startDate`, `endDate`, and `b_endDate`. The response still returned 10 rows for the tested search, matching the earlier finding that `maxResults` is accepted but not caller-controlled for this mode.

### Integrated Company-Name Filing Search Notes

Observed on 2026-05-07 at `https://dart.fss.or.kr/dsab007/main.do?option=corp` using browser interaction and direct POST replay.

The `회사명` mode (`option=corp`) uses an explicit company-selection step when a typed company name maps to multiple DART companies. Searching `케이티` opened the `회사명찾기` popup before loading filing results. The popup showed two checked candidates:

| Market badge | Company name | DART company code | Representative | Stock code | Industry |
|---|---|---|---|---|---|
| `기` | `케이티` | `00186461` | `이영순` | empty | `기타 엔지니어링 서비스업` |
| `유` | `케이티` | `00190321` | `박윤영` | `030200` | `전기 통신업` |

Observed popup replay endpoint and fields:

- endpoint: `POST /corp/searchCorp.ax`
- fields: `currentPage=1`, `maxResults=15`, `maxLinks=10`, `textCrpNm=케이티`, `histYn=Y`, repeated `corpType=P/A/X/E`
- candidate company codes are in hidden `hiddenCikCD1` inputs; candidate names are in `hiddenCikNM1`
- candidate row title text includes company name, English name, representative, business registration number, and industry

After deselecting the `기` row and confirming the `유 케이티` row, the main form held `textCrpCik=00190321`, `textCrpNm=케이티`, and `textCrpNm2=케이티`. The subsequent filing search replayed against `POST /dsab007/detailSearch.ax`.

A direct replay with `textCrpCik=00190321` and empty `textCrpNm` / `textCrpNm2` returned the same result set, so the filing search can bypass the UI resolution popup when the 8-digit DART company code is already known.

Observed selected-company filing replay fields:

- `currentPage=1`
- `maxResults=15`
- `maxLinks=10`
- `sort=date`
- `series=desc`
- `option=corp`
- `textCrpNm=케이티`
- `textCrpNm2=케이티`
- `textCrpCik=00190321`
- `startDate=20250507`
- `endDate=20260507`
- `finalReport=recent`
- `businessCode=all`
- `businessNm=전체`
- `corporationType=all`
- `closingAccountsMonth=all`
- `autoSearch=N`
- `autoSearchCorp=Y`

Observed result shape:

- table columns: `번호`, `공시대상회사`, `보고서명`, `제출인`, `접수일자`, `비고`
- company cell includes market badge and a company popup link such as `openCorpInfoNew('00190321', ...)`
- report link points to `/dsaf001/main.do?rcpNo={rcpNo}` and calls `openReportViewer(rcpNo, '')`; no `dcmNo` was present in the observed rows
- pager for selected `유 케이티` showed `[1/12] [총 169건]`
- first observed row was receipt `20260504800404`, report `기업설명회(IR)개최(안내공시)`, presenter `케이티`, date `2026.05.04`

Observed page-size and sort behavior for selected `유 케이티`:

- `maxResults=15`, `30`, `50`, and `100` were honored and matched the UI dropdown
- `maxResults=2` fell back to 15 rows, so arbitrary page sizes should not be exposed as a public contract
- `sort=date` with `series=desc` was replay-observed
- the UI exposes `회사명` and `보고서명` sort anchors whose IDs suggest `sort=crp` and `sort=rpt`, but those replay values were not verified in this investigation

Current implication:

- integrated company-name filing search is replayable without browser automation
- the public `search-company-reports` contract should be code-first and require the resolved 8-digit DART company code
- callers that only know a company name should use the existing `search-company` capability first, then pass the selected `companyCode` to `search-company-reports`
- `/corp/searchCorp.ax` remains useful source evidence for the browser UI's chooser, but it should not be part of this operation unless a separate convenience wrapper is intentionally added later
- the draft target spec is `docs/specs/dsab007-search-company-reports-v1.md`

### Official DART Search Guide

Observed on 2026-05-05:

- URL: `https://dart.fss.or.kr/guide/main.jsp?menu=122`
- guide title: `공시 서류 검색 – 공시통합검색`

Use this guide as the human-facing explanation source for DART search concepts and future tool copy. It documents the Korean UI semantics more comprehensively than this implementation currently supports. It is a UI/user guide, not a replay API specification; keep using live request probes and parser tests for POST-field behavior.

Guide-backed concepts relevant to the current `search-body` slice:

- `공시통합검색` is for searching submitted disclosure documents by company, report, report table of contents, and document body content.
- `검색구분` set to `전체` groups results by company, report, TOC, and body content; selecting a specific `검색구분` opens that detailed search directly.
- `본문내용` search means searching within disclosure document contents.
- DART documents this keyword syntax as common search syntax:
  - AND condition (`공백`, space): `사과 포도` searches for documents where both `사과` and `포도` exist.
  - OR condition (`|`): `사과|포도` searches for documents where either `사과` or `포도` exists.
  - NOT condition (`!`): `사과!포도` excludes documents containing `포도` from results for `사과`.
  - EXACT condition (`" "`): `"사과 포도"` searches for a word/phrase made exactly of `사과포도` or `사과 포도` in that order; no other word or phrase may appear between `사과` and `포도`.
- `동의어` expands some Korean/English variants, such as `비즈니스`, `비지니스`, and `business`; this UI control is not implemented in the public contract.
- The guide describes company lookup, presenter lookup, date entry and quick date buttons, body-vs-attachment document target, report-name lookup, disclosure-type filters, result page-size choices, and sort choices.

Documentation implication:

- Use the official guide for Korean labels, field explanations, examples, and future tool descriptions.
- Do not treat guide-only fields as implemented. A field becomes part of the public contract only when live replay behavior is observed, mapped, tested, and added to the current spec.

Observed replay payload shape for `option=contents`:

- `currentPage`, `maxResults`, `maxLinks`
- `sort`, `sortType`
- `option=contents`
- `keyword`
- `startDate`, `endDate`
- duplicated or replay-only fields such as `b_keyword`, `b_startDate`, `b_endDate`
- optional company and presenter fields such as `textCrpCik`, `textCrpNm`, `textPresenterNm`

Observed `option=contents` sort controls from the live `/dsab007/search.ax` fragment:

- sort anchors render `clickSort(this, 'DATE')` and `clickSort(this, 'rpt_nm')`
- the active sort direction toggles between `오름차순` and `내림차순`, matching `sortType=asc|desc`
- no third sort field was observed in the fragment for this mode on 2026-03-31

Observed replay result shape:

- `검색건수 : N`
- filing rows with company badge, company name, filing link, snippet, info tags, and filing date
- filing links like `/dsaf001/main.do?rcpNo={rcpNo}&dcmNo={dcmNo}&keyword={keyword}`
- `totalCnt` as a hidden input
- pagination like `[1/4] [총 32건]`

Observed field behavior for the current `option=contents` replay contract:

- `currentPage` is accepted and honored for result paging
- `maxResults` is accepted by the endpoint but ignored for tested values; replayed requests with `maxResults=2` still returned 10 rows and page counts consistent with 10-row paging
- `maxLinks` is accepted by the endpoint but ignored for tested values; pager width remains upstream-controlled
- `textCrpCik`, `textPresenterNm`, and `reportName` are accepted and honored in tested seeded filters
- `textCrpNm` is accepted but ignored for the replay shape used here
- treat page size and pager width as upstream-controlled for now

Observed no-result behavior:

- `검색건수 : 0`
- table body containing `조회 결과가 없습니다.`
- on 2026-03-31, the placeholder appeared as a bare `td colspan="3">조회 결과가 없습니다.</td>` directly under `tbody`
- on 2026-03-31, the no-result fragment omitted the `.pageInfo` pagination block entirely

Current implication:

- body-content search is replayable today without browser automation
- the response still needs HTML parsing, but the implementation should keep `dsab007` field semantics explicit instead of normalizing too early
- v1 should start with one mode, but under a shared `dsab007` search core rather than a one-off body-search module

## Company Overview Search Surface Notes

Observed on 2026-05-07 at `https://dart.fss.or.kr/dsae001/main.do` using browser interaction and direct POST replay.

The visible page title is `기업개황`. The main tabs are:

- `회사별`
- `업종별`

The current implementation covers only `회사별` company-name search.

Observed `회사별` UI controls:

| Korean UI control | Observed DOM or POST field | Current implementation status |
|---|---|---|
| `회사별` tab | fixed page tab | implemented as fixed capability choice |
| `검색조건 선택=회사명` | `searchType=1` | implemented as fixed capability choice |
| `검색어입력` | `textCrpNm` | implemented as required public `companyName` |
| result page | `currentPage` | implemented as public `page`, default `1` |
| result page size | `maxResults` | implemented as public `pageSize`, default/max `45` |
| `유가`, `코스닥`, `코넥스`, `기타` | repeated `corpType=P/A/X/E`, `corpTypeAll=all` | implemented as fixed all-company search, not caller-configurable |
| `사업자등록번호` | `searchType=2`, `bsnRgsNo` and split visible fields | observed, not implemented |
| `법인등록번호` | `searchType=3`, `crpRgsNo` | observed, not implemented |
| Korean initial links `ㄱ` ... `M~Z` | `searchIndex` | observed, not implemented |
| `업종별` tab | `businessCode` via industry tree | observed, not implemented |

Observed direct replay payload for company-name search:

- `currentPage`, `maxResults`, `maxLinks`
- `searchType=1`
- `textCrpNm={companyName}`
- `businessCode=all`
- `corpTypeAll=all`
- repeated `corpType=P`, `corpType=A`, `corpType=X`, `corpType=E`
- supporting empty fields: `sort`, `series`, `gubun`, `selectKey`, `searchIndex`, `textCrpCik`, `bsnRgsNo`, `bsnRgsNo_1`, `bsnRgsNo_2`, `bsnRgsNo_3`, `crpRgsNo`

Observed result fragment shape:

- table `#corpTable`
- company rows with market badge, company link, and stock-code cell
- company links like `javascript:select('00126380');`
- pager text like `[1/7] [총 296건]`
- no-result row `tr.noData` containing `일치하는 회사명이 없습니다.`

Company code finding:

- The company search result row does include the 8-digit DART company code in the company link's `select(...)` argument.
- Example for 삼성전자: link `javascript:select('00126380');`, stock code `005930`.
- The selected company detail request uses the same code as `selectKey` for `POST /dsae001/select.ax`.
- The selected company detail fragment includes fields such as `회사이름`, `영문명`, `공시회사명`, `종목코드`, `대표자명`, `법인구분`, `법인등록번호`, `사업자등록번호`, `주소`, `홈페이지`, `전화번호`, `팩스번호`, `업종명`, `설립일`, and `결산월`.

Observed page-size behavior:

- Without `maxResults`, the tested `삼성` search returned 45 rows per page.
- `maxResults=10`, `15`, and `20` were honored in tested requests.
- `maxResults=50` still returned 45 rows, so the implemented public maximum is 45.

Current implication:

- `dsae001` company-name search is replayable without browser automation.
- The result list is enough to resolve company names to DART company codes.
- Full company detail normalization is handled by the separate `company-detail` command through `/dsae001/select.ax`.
- Company-specific RSS is handled by the separate `company-rss` command through `/api/companyRSS.xml?crpCd={companyCode}`.

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

## Follow-Ups

Completed for the first search-body slice:

- classified the implemented `/dsab007/search.ax` contents replay fields into public semantic inputs versus internal replay-only fields
- defined and implemented the parsed result row model for the current tool contract

Completed for the first view-report slice:

- confirmed `/report/viewer.do` content retrieval through shell-provided viewer parameters
- implemented `view-report` as receipt-to-document/TOC discovery plus selected section retrieval for TOC-backed documents
- implemented selected-document retrieval for no-TOC documents through the shell's initial viewer locator

Future investigation, not current v1 scope:

- decide whether TOC-backed full-document stitching is useful enough to specify
- evaluate PDF download and XBRL preview mappings when those become product priorities
