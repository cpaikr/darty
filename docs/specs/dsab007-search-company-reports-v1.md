# dsab007 Search Company Reports v1

## 1. Identity

- `name`: `dsab007-search-company-reports-v1`
- `operation`: `search-company-reports`
- `owner`: `darty`
- `domain`: DART integrated filing search by selected company through `dsab007`
- `users`: LLM agents and scripts that need company-specific filing lists from a stable DART company identifier

## 2. Capability Boundary

This capability targets the `회사명` mode on DART `공시통합검색`, but exposes the stable 8-digit DART company code instead of the browser UI's ambiguous company-name chooser.

It does:

- search filings for a selected DART company through canonical OpenAPI
  operation `searchCompanyReportsFragment`
- require the 8-digit DART company code as the public company identifier
- parse the returned filing-result fragment into structured filing rows
- return filing references usable by `view-report`
- guide callers who only know a name to use `search-company` first

It does not:

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

- Code-first replay can bypass the popup when the resolved company code is
  supplied without company-name text.
- Replaying selected `케이티` by company code alone returned the same filing
  result set.
- Therefore the public operation is code-first: the popup is source evidence for how the UI resolves names, not part of this operation's stable contract.

Public input mapping. Upstream form fields are canonical in OpenAPI operation
`searchCompanyReportsFragment` and are intentionally not repeated here.

| Korean DART UI | Public input | Status |
|---|---|---|
| search selector `회사명` | fixed capability choice | implemented; not caller-configurable |
| popup-selected company | `companyCode` | implemented and required |
| `검색시작일` | `startDate` | implemented and required |
| `검색종료일` | `endDate` | implemented and required |
| result page | `page` | implemented; default `1` |
| page-size dropdown `15/30/50/100` | `pageSize` | implemented; default `15`; public compatibility aliases `5` and `10` normalize to `15` |
| result sort `접수일자` | fixed internal default | implemented; replay-observed; not caller-configurable in v1 |
| sort direction | `sortDirection=asc\|desc` | implemented; default `desc` |
| `제출인명` | `presenterName` | implemented; optional |
| `보고서명` | `reportName` | implemented; optional |
| `공시유형` detailed checkboxes | `disclosureTypes[]` | implemented; DART detail codes such as `A001`, `I001` |
| `업종` | `industryCode` | implemented; default `all`; DART industry tree code such as `612` |
| `법인유형` | `corporationType` | implemented; default `all`; values `P`, `A`, `N`, `E` |
| `결산유형` | `closingAccountsMonth` | implemented; default `all`; canonical values `01` through `12`; CLI aliases `1` through `9` normalize to `01` through `09` |
| `최종보고서` filter opt-out | `includeAllReports` | implemented; default `false` |

Observed but not included in the first public contract:

- free-text `회사명` input and popup company resolution
- selecting multiple companies at once
- result sort by `회사명` (`sort=crp`) and `보고서명` (`sort=rpt`); observed in UI, replay verification pending
- quick date buttons and extended date presets

## 4. Company Identity Contract

`search-company-reports` uses `companyCode` as the only public company selector.

Rationale:

- DART company names are ambiguous; `케이티` maps to at least two DART company codes.
- The filing replay operation accepts the selected company code directly, so
  the browser popup can be bypassed.
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

The operation includes a company name when result rows provide one, but it does
not require or trust `companyName` as an input.

## 5. Public Operation

### `search-company-reports`

Inputs:

| Field | Required | Constraint | Notes |
|---|---:|---|---|
| `companyCode` | yes | 8 digits | DART company code, not a 6-digit stock code |
| `startDate` | yes | `YYYYMMDD` | DART search start date; date window must be at most 10 years |
| `endDate` | yes | `YYYYMMDD` | DART search end date; date window must be at most 10 years |
| `page` | no | integer `1` through `100` | default `1` |
| `pageSize` | no | `5`, `10`, `15`, `30`, `50`, or `100` | default `15`; compatibility aliases `5` and `10` normalize to `15` in `result.request`; upstream choices remain `15`, `30`, `50`, and `100` |
| `sortDirection` | no | `asc`, `desc` | default `desc`; sort field is fixed internally to receipt date |
| `presenterName` | no | non-empty text when supplied | DART `제출인명` filter |
| `reportName` | no | non-empty text when supplied | DART `보고서명` filter |
| `disclosureTypes` | no | array of known DART detailed public type codes like `A001` | repeated `publicType`; validates against the implemented detailed-code table; exposed in the CLI by repeating `--disclosure-type` |
| `industryCode` | no | `all`, `ROOTdddd`, or 2-5 digit DART industry code | default `all`; exposed as `--industry-code` |
| `corporationType` | no | `all`, `P`, `A`, `N`, or `E` | default `all`; maps to 법인유형 |
| `closingAccountsMonth` | no | `all` or `01` through `12` | default `all`; maps to 결산월; CLI accepts `1` through `9` and normalizes output request values to zero-padded canonical values |
| `includeAllReports` | no | boolean | default `false`; exposed in the CLI as `--include-all-reports` |
| `detail` | no | `concise`, `detailed`, or `raw` | default `concise`; controls output projection, not DART replay |

Output envelope:

- `result.request`: normalized request
- `result.company`: always includes the normalized request `companyCode`; company
  name and market label are included when result rows provide them
- `result.pagination`: current page, total pages, total count, returned count
- `result.items[]`: filing rows
- `metadata`: source endpoint, fetched time, observed source behavior, completeness, dropped row count
- `references.searchUrl`: canonical upstream URL for OpenAPI operation
  `searchCompanyReportsFragment`
- `warnings`: recoverable notices such as partial row drops or ambiguous per-row disclosure-type attribution

Result item fields:

- `company.name`
- `company.companyCode`
- `company.marketLabel`
- `filing.receiptNumber`
- `filing.reportTitle`
- `filing.receiptDate`
- `filing.presenterName`
- `matchedDisclosureType` when the request has exactly one effective `disclosureTypes` code. This attribution is request-level evidence from the single `publicType` filter, not a row HTML field. It includes `code`, optional `label`, `category`, `categoryLabel`, and `evidence.source=single_disclosure_type_request`.
- `references.viewerUrl`
- `remarks[]` for `비고` badges/text, including raw title text when DART provides it
- `evidence.rawRowText` when `detail` is `detailed` or `raw`; omitted in default `concise` responses

When a request uses multiple distinct `disclosureTypes`, do not infer a row's matched code from the report title. DART's observed result rows do not expose the matched `publicType`, so return rows without `matchedDisclosureType` and include a `matched_disclosure_type_ambiguous` warning when rows are returned. If row-level attribution matters, callers should rerun with one `disclosureTypes` code.

Empty result sets are successful searches, not failures. When DART returns a recognized no-result table, return `items: []`, `currentPage: 1`, `totalPages: 1`, `totalCount: 0`, and `returnedCount: 0` so consumers do not render an awkward page `1/0`.
The result also includes a `no_results` warning.

The accepted disclosure, industry, corporation, and closing-account code sets
are project decisions bounded by documented DART code families. The
[`dart-source-map.md`](../research/dart-source-map.md) evidence proves
representative values, not every accepted value.

Failures:

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, has an unsupported option, or has an invalid date range |
| `source_unavailable` | yes | DART search endpoint could not be fetched |
| `source_changed` | no | search HTML no longer matches required parser assumptions |
| `source_parse_failure` | no | response HTML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

Typed failures may include optional `recoveryHint` with a concise next action for common recoverable invalid inputs, such as resolving an 8-digit `companyCode` with `search-company` or correcting date, page, page-size, and DART code filters. Shape-valid but unknown `disclosureTypes` values such as `A999` are invalid requests; callers should recover by using `darty disclosure-types --query <query>`.

For caller-facing DART filter code examples and labels, see [`dart-filter-codes.md`](dart-filter-codes.md). For detailed disclosure-type discovery, use `darty disclosure-types --query <query>`.

## 6. Source and Wire Ownership

The supported request is canonical in OpenAPI operation
`searchCompanyReportsFragment` in
[`dart-wire-v1.openapi.yaml`](dart-wire-v1.openapi.yaml). Filing-row and
pagination grammar is canonical in
[`dart-html-viewer-v1.md`](dart-html-viewer-v1.md). Browser popup behavior,
filter probes, date-window evidence, result examples, and adjacent routes remain
non-normative in the [`DART source map`](../research/dart-source-map.md).

The public v1 contract keeps receipt-date sorting internal and exposes only
`sortDirection`. It rejects date windows longer than ten years and preserves
the page-size compatibility aliases described above; those are product
decisions rather than additional wire fields.
