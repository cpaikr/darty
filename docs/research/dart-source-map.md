# DART Source Map

Captured on 2026-03-31.

Method:

- inspected the live home page and search page in a browser session
- replayed representative pages with `curl`
- inspected the report viewer HTML and embedded viewer state
- checked the adjacent OpenDART home page and API list

This document records source evidence for the DART ecosystem. It is not yet the public tool spec.

## Surface Map

### Main DART Site

- Browser origin: `https://dart.fss.or.kr/`
- Home page title observed: `전자공시시스템`
- Main search page observed: `https://dart.fss.or.kr/dsab007/main.do?option=corp`
- Report viewer observed: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcpNo}`

### OpenDART

- Adjacent site origin: `https://opendart.fss.or.kr/`
- Home page title observed: `전자공시 OPENDART 시스템`
- API-list page observed: `https://opendart.fss.or.kr/intro/infoApiList.do`
- Home page visibly exposes login and API-key flows

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
- `https://opendart.fss.or.kr/xbrl/viewer/main.do?rcpNo={rcpNo}`
  OpenDART-linked XBRL viewer route referenced by the report viewer source.

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

Observed from the live search page and home-page source:

- the integrated filing search page is HTML-driven, not obviously a public JSON API
- search modes include company, report name, TOC name, body content, and advanced search
- the page exposes date-range filters, final-report filtering, and multiple find-popup flows
- the home page references classic `.do` and `.ax` module routes rather than one clean API surface

Current implication:

- DART search is likely more fragmented than KASB search
- v1 may need to choose one narrow search workflow first instead of promising broad search coverage up front

## Adjacent Feeds And Supporting Surfaces

Observed in the report viewer source:

- `https://dart.fss.or.kr/api/todayRSS.xml`
- `https://dart.fss.or.kr/api/companyRSS.xml?crpCd={companyCode}`

These may be useful for lightweight feed operations, but they are supporting surfaces, not yet the primary contract.

## OpenDART Notes

Observed from the live OpenDART pages:

- the site clearly separates API information, API-key management, and developer guides
- API access likely introduces authentication and coverage tradeoffs compared with anonymous browsing on the main DART site
- OpenDART is adjacent, not a drop-in replacement for every DART page flow

Current implication:

- OpenDART may be the right source for some operations, but the project should not assume one surface fully subsumes the other before evidence exists

## Current v1 Recommendation

Treat the source strategy as undecided, but bias the contract design toward a hybrid-friendly model:

- public ids should prefer company and filing identifiers that can survive source changes
- section byte ranges and low-level viewer offsets should stay internal unless proven necessary
- keep search and retrieval separate
- keep XBRL as an explicit extension point, not an assumed v1 dependency

## Immediate Follow-Ups

- confirm what request shape `/report/viewer.do` accepts directly and what it returns
- map the site-side company code conventions to OpenDART identifiers
- determine whether a narrow filing-search flow can be replayed without a browser
- choose whether v1 starts from filing metadata, filing content, or both
