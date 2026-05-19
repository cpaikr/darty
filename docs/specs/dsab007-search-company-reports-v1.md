# dsab007 Search Company Reports v1

## 1. Identity

- `name`: `dsab007-search-company-reports-v1`
- `operation`: `search-company-reports`
- `owner`: `darty`
- `status`: draft
- `domain`: DART integrated filing search by selected company through `dsab007`
- `users`: LLM agents and scripts that need company-specific filing lists from a stable DART company identifier

## 2. Capability Boundary

This capability targets the `회사명` mode on DART `공시통합검색`, but exposes the stable 8-digit DART company code instead of the browser UI's ambiguous company-name chooser.

It should:

- search filings for a selected DART company through `https://dart.fss.or.kr/dsab007/detailSearch.ax`
- require the 8-digit DART company code as the public company identifier
- parse the returned filing-result fragment into structured filing rows
- return filing references usable by `view-report`
- guide callers who only know a name to use `search-company` first

It should not yet:

- implement name-to-company resolution inside this operation
- implement other `dsab007` modes such as `보고서명`, `보고서 목차명`, `본문내용`, `전체`, or `고급검색`
- expose all advanced-search filters from the page
- rely on browser automation or UI popups as part of the public operation
- fetch report sections; use `view-report` with a returned receipt number or viewer URL

## 3. Observed Korean UI Slice

Observed UI entrypoint:

- `공시서류검색 > 공시통합검색`
- URL: `https://dart.fss.or.kr/dsab007/main.do?option=corp`
- mode: `회사명` (`option=corp`)

Observed browser flow for `케이티` on 2026-05-07:

1. Entering `케이티` in `회사명` and clicking `검색` opened `회사명찾기` instead of immediately showing filings.
2. The popup called the company lookup surface and showed two checked candidates:
   - `기 케이티`, company code `00186461`, representative `이영순`, no stock code, industry `기타 엔지니어링 서비스업`
   - `유 케이티`, company code `00190321`, representative `박윤영`, stock code `030200`, industry `전기 통신업`
3. Selecting only `유 케이티` and confirming populated hidden `textCrpCik=00190321`.
4. The page then loaded filing rows for `케이티`; the observed first page returned 15 rows and pager `[1/12] [총 169건]`.

Direct replay finding:

- `POST /dsab007/detailSearch.ax` can bypass the popup when `textCrpCik={companyCode}` is supplied.
- Replaying selected `케이티` with `textCrpCik=00190321` and empty `textCrpNm` still returned the same filing result set.
- Therefore the public operation should be code-first: the popup is source evidence for how the UI resolves names, not part of this operation's stable contract.

Target input mapping:

| Korean DART UI | Public input | Internal replay field | Status |
|---|---|---|---|
| search selector `회사명` | fixed capability choice | `option=corp` | target; not caller-configurable |
| popup-selected company | `companyCode` | `textCrpCik` | target and required |
| `검색시작일` | `startDate` | `startDate` | target and required |
| `검색종료일` | `endDate` | `endDate` | target and required |
| result page | `page` | `currentPage` | target; default `1` |
| page-size dropdown `15/30/50/100` | `pageSize` | `maxResults` | target; default `15` |
| result sort `접수일자` | fixed internal default | `sort=date` | target; replay-observed; not caller-configurable in v1 |
| sort direction | `sortDirection=asc\|desc` | `series=asc\|desc` | target; default `desc` |
| `제출인명` | `presenterName` | `textPresenterNm` | target; optional |
| `보고서명` | `reportName` | `reportName`, `reportName2` | target; optional |
| `공시유형` detailed checkboxes | `disclosureTypes[]` | repeated `publicType` | target; DART detail codes such as `A001`, `I001` |
| `업종` | `industryCode` | `businessCode` | target; default `all`; DART industry tree code such as `612` |
| `법인유형` | `corporationType` | `corporationType` | target; default `all`; values `P`, `A`, `N`, `E` |
| `결산유형` | `closingAccountsMonth` | `closingAccountsMonth` | target; default `all`; canonical values `01` through `12`; CLI aliases `1` through `9` normalize to `01` through `09` |
| `최종보고서` filter opt-out | `includeAllReports` | omit/blank `finalReport` when true; otherwise `finalReport=recent` | target; default `false` |

Observed but not included in the first public contract:

- free-text `회사명` input and popup company resolution
- selecting multiple companies at once
- result sort by `회사명` (`sort=crp`) and `보고서명` (`sort=rpt`); observed in UI, replay verification pending
- quick date buttons and extended date presets

## 4. Company Identity Contract

`search-company-reports` should use `companyCode` as the only public company selector.

Rationale:

- DART company names are ambiguous; `케이티` maps to at least two DART company codes.
- The filing replay endpoint accepts the selected company code directly through `textCrpCik`, so the browser popup can be bypassed.
- The repo already has `search-company`, which resolves company names to 8-digit DART company codes.
- Keeping this operation code-first avoids a result type that sometimes returns filings and sometimes returns candidate companies.

Caller flow when only a name is known:

```bash
darty search-company --company-name 케이티

darty search-company-reports \
  --company-code 00190321 \
  --start-date 20250507 \
  --end-date 20260507
```

The operation may include the company name parsed from result rows in the output, but it should not require or trust `companyName` as an input.

## 5. Public Operation

### `search-company-reports`

Inputs:

| Field | Required | Constraint | Notes |
|---|---:|---|---|
| `companyCode` | yes | 8 digits | DART company code, not a 6-digit stock code |
| `startDate` | yes | `YYYYMMDD` | DART search start date |
| `endDate` | yes | `YYYYMMDD` | DART search end date; window must stay within DART's accepted range |
| `page` | no | integer `>= 1` | default `1` |
| `pageSize` | no | `15`, `30`, `50`, or `100` | default `15` |
| `sortDirection` | no | `asc`, `desc` | default `desc`; sort field is fixed internally to receipt date |
| `presenterName` | no | non-empty text when supplied | DART `제출인명` filter |
| `reportName` | no | non-empty text when supplied | DART `보고서명` filter |
| `disclosureTypes` | no | array of DART detailed public type codes like `A001` | repeated `publicType`; exposed in the CLI by repeating `--disclosure-type` |
| `industryCode` | no | `all`, `ROOTdddd`, or 2-5 digit DART industry code | default `all`; exposed as `--industry-code` |
| `corporationType` | no | `all`, `P`, `A`, `N`, or `E` | default `all`; maps to 법인유형 |
| `closingAccountsMonth` | no | `all` or `01` through `12` | default `all`; maps to 결산월; CLI accepts `1` through `9` and normalizes output request values to zero-padded canonical values |
| `includeAllReports` | no | boolean | default `false`; exposed in the CLI as `--include-all-reports` |

Output envelope:

- `result.request`: normalized request
- `result.company`: selected company as parsed from result rows when available, including `companyCode`, name, and market label
- `result.pagination`: current page, total pages, total count, returned count
- `result.items[]`: filing rows
- `metadata`: source endpoint, fetched time, observed source behavior, completeness, dropped row count
- `references.searchUrl`: `https://dart.fss.or.kr/dsab007/detailSearch.ax`
- `warnings`: partial row drops if parsing failed for individual rows

Result item fields:

- `company.name`
- `company.companyCode`
- `company.marketLabel`
- `filing.receiptNumber`
- `filing.reportTitle`
- `filing.receiptDate`
- `filing.presenterName`
- `references.viewerUrl`
- `remarks[]` for `비고` badges/text, including raw title text when DART provides it
- `evidence.rawRowText`

Empty result sets are successful searches, not failures. When DART returns a recognized no-result table, return `items: []`, `currentPage: 1`, `totalPages: 1`, `totalCount: 0`, and `returnedCount: 0` so consumers do not render an awkward page `1/0`.

Failures:

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, has an unsupported option, or has an invalid date range |
| `source_unavailable` | yes | DART search endpoint could not be fetched |
| `source_changed` | no | search HTML no longer matches required parser assumptions |
| `source_parse_failure` | no | response HTML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

Typed failures may include optional `recoveryHint` with a concise next action for common recoverable invalid inputs, such as resolving an 8-digit `companyCode` with `search-company` or correcting date, page, page-size, and DART code filters.

For caller-facing DART filter code examples and labels, see [`dart-filter-codes.md`](dart-filter-codes.md).

## 6. Source Replay Notes

Observed company lookup endpoint used by the browser popup:

- `POST https://dart.fss.or.kr/corp/searchCorp.ax`

This popup endpoint is source evidence only for this operation. Public company-name resolution should remain in `search-company` unless a separate convenience wrapper is intentionally added later.

Observed popup fields for the `케이티` UI flow:

- `currentPage=1`
- `maxResults=15`
- `maxLinks=10`
- `textCrpNm=케이티`
- `histYn=Y`
- repeated `corpType=P`, `A`, `X`, `E`

Observed popup row evidence:

```html
<input type='hidden' name='hiddenCikCD1' value='00190321'>
<input type='hidden' name='hiddenCikNM1' value='케이티'>
<td class="tL ellipsis" title="회사명 :케이티 ... 업종 :전기 통신업">
  <span class="tagCom_kospi" title="유가증권시장">유</span>케이티
</td>
<td>030200</td>
```

Observed filing search endpoint:

- `POST https://dart.fss.or.kr/dsab007/detailSearch.ax`

Observed filing replay fields after selecting `유 케이티`:

- `currentPage=1`
- `maxResults=15`
- `maxLinks=10`
- `sort=date`
- `series=desc`
- `option=corp`
- `textCrpNm=케이티`
- `textCrpNm2=케이티`
- `textCrpCik=00190321`
- optional `textPresenterNm`
- optional `reportName` and `reportName2`
- repeated optional `publicType`
- `startDate=20250507`
- `endDate=20260507`
- `finalReport=recent`
- `businessCode=all`
- `businessNm=전체`
- `corporationType=all`
- `closingAccountsMonth=all`
- `autoSearch=N`
- `autoSearchCorp=Y`

Observed sort behavior:

- `sort=date` and `series=desc` were replay-observed for the selected `케이티` search.
- The public v1 contract keeps `sort=date` internal and exposes only `sortDirection`.
- The UI exposes sort anchors for `접수일자`, `회사명`, and `보고서명`; their anchor IDs suggest `date`, `crp`, and `rpt`.
- `crp` and `rpt` should stay out of the public contract until direct replay proves they are honored and the product chooses to expose a sort-field option.

Observed code-first replay variation:

- `textCrpCik=00190321`
- `textCrpNm=` empty
- `textCrpNm2=` empty
- same date, sort, and filter fields as above
- result still returned 15 rows and pager `[1/12] [총 169건]`

Observed advanced filter behavior on 2026-05-08 for `textCrpCik=00190321`, `20250507..20260507`:

- `textPresenterNm=케이티` reduced the result set from 169 to 63 rows.
- `reportName=사업보고서` and `reportName2=사업보고서` returned 1 row.
- `publicType=I001` returned 20 rows; `publicType=A001` returned 1 row.
- `businessCode=612` matched the baseline company result set, while unrelated `businessCode=011` returned no rows.
- `corporationType=P` matched the baseline company result set, while `corporationType=A` returned no rows.
- `closingAccountsMonth=12` matched the baseline company result set, while `closingAccountsMonth=11` returned no rows.

Observed result row shape:

```html
<span class="tagCom_kospi" title="유가증권시장">유</span>
<a href="javascript:openCorpInfoNew('00190321', 'winCorpInfo', '/dsae001/selectPopup.ax');">
  케이티
</a>
<a href="/dsaf001/main.do?rcpNo=20260504800404"
   onclick="openReportViewer('20260504800404',''); return false;">
  기업설명회(IR)개최(안내공시)
</a>
<td class="tL ellipsis" title="케이티">케이티</td>
<td>2026.05.04</td>
<td><span class="tagCom_kospi_other" title="본 공시사항은 한국거래소 유가증권시장본부 소관임">유</span></td>
```

Observed page-size behavior for selected `케이티` on 2026-05-07:

- `maxResults=15` returned 15 rows and `[1/12] [총 169건]`
- `maxResults=30` returned 30 rows and `[1/6] [총 169건]`
- `maxResults=50` returned 50 rows and `[1/4] [총 169건]`
- `maxResults=100` returned 100 rows and `[1/2] [총 169건]`
- `maxResults=2` fell back to 15 rows, so the public contract should expose only the observed UI page-size choices
