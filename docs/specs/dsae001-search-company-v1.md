# dsae001 Search Company v1

## 1. Identity

- `name`: `dsae001-search-company-v1`
- `owner`: `darty`
- `domain`: DART company overview search through `dsae001`
- `users`: LLM agents and scripts that need to resolve company names to DART company codes

## 2. Capability Boundary

This capability implements only the `회사별` slice of DART `기업개황`.

It does:

- search companies by company name through canonical OpenAPI operation
  `searchCompanyFragment`
- parse the returned HTML fragment into structured company rows
- expose the 8-digit DART company code from each result row
- include the 6-digit stock code when DART displays one

It does not:

- implement `업종별` search
- search by business registration number or corporate registration number
- fetch company details; the separate `company-detail` operation owns that lookup
- expose market filters until the public contract is intentionally expanded

## 3. Observed Korean UI Slice

Observed UI entrypoint:

- `기업개황 > 기업개황`
- URL: `https://dart.fss.or.kr/dsae001/main.do`
- implemented tab: `회사별`

Public input mapping. Upstream form fields are canonical in OpenAPI operation
`searchCompanyFragment` and are intentionally not repeated here.

| Korean DART UI | Public input | Status |
|---|---|---|
| tab `회사별` | fixed capability choice | implemented; not caller-configurable |
| `검색조건 선택=회사명` | fixed capability choice | implemented; not caller-configurable |
| `검색어입력` | `companyName` | implemented and required |
| result page | `page` | implemented; default `1` |
| result page size | `pageSize` | implemented; default `15`, max `45` |
| company-type checkboxes `유가`, `코스닥`, `코넥스`, `기타` | fixed all-company search | implemented as all selected; not caller-configurable |

Implemented output mapping:

| Korean DART result UI | Public result field |
|---|---|
| result link `javascript:select('00126380')` | `item.companyCode` |
| company link text | `item.companyName` |
| market badge/title | `item.marketKind`, `item.marketLabel` |
| `종목코드` column | `item.stockCode` when non-empty |
| pager `[현재/전체] [총 N건]` | `result.pagination.currentPage`, `totalPages`, `totalCount` |

## 4. Company Code Finding

Observed result rows include the DART company code in the company link, for example:

```html
<a href="javascript:select('00126380');" title="삼성전자 기업개황 ">삼성전자</a>
```

For 삼성전자, the observed values are:

- DART company code: `00126380`
- stock code: `005930`

The DART company code is the 8-digit identifier used by DART company popup/detail and RSS flows. It is different from the 6-digit stock code.

## 5. Public Operation

### `search-company`

Inputs:

- `companyName` (required): trimmed company-name query, minimum 2 characters
- `page` (optional): 1-based page number, default `1`, maximum `100`
- `pageSize` (optional): number of rows to request, default `15`, maximum `45`

The `pageSize` range is a project contract bounded by the observed source cap.
Live probes established that 10, 15, and 20 are honored and 50 is capped at
45; they did not prove every integer in the accepted range independently.

Output envelope:

- `result.request`: normalized request
- `result.pagination`: current page, total pages, total count, returned count
- `result.items[]`: company rows with `companyCode`, `companyName`, optional `stockCode`, market label/kind, detail references, and raw evidence
- `metadata`: DART source endpoint, observed behavior, completeness, and dropped row count
- `references.searchUrl`: source POST endpoint
- `warnings`: `partial_rows_dropped` when individual rows cannot be parsed and
  `no_results` when a valid search returns no companies

A recognized empty result is successful. It returns `items: []`, preserves the
requested `currentPage`, reports `totalPages: 0`, `totalCount: 0`, and
`returnedCount: 0`, and includes the `no_results` warning. This intentionally
differs from the normalized page 1-of-1 empty shape used by
`search-company-reports`.

Failures:

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, or contains unknown fields |
| `source_unavailable` | yes | DART search endpoint could not be fetched |
| `source_changed` | no | company search HTML no longer matches required parser assumptions |
| `source_parse_failure` | no | response HTML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

Typed failures may include optional `recoveryHint` with a concise next action for common recoverable invalid inputs, such as correcting page or page-size values.

## 6. Source and Wire Ownership

The supported request is canonical in OpenAPI operation
`searchCompanyFragment` in
[`dart-wire-v1.openapi.yaml`](dart-wire-v1.openapi.yaml). Company-row and
pagination grammar is canonical in
[`dart-html-viewer-v1.md`](dart-html-viewer-v1.md). Investigation history and
adjacent routes remain non-normative in the
[`DART source map`](../research/dart-source-map.md).

Implemented reference behavior constructs an absolute
`/dsae001/select.ax?selectKey={companyCode}` `detailEndpoint`. The search
operation returns this locator without fetching or normalizing the table.
The separate `fetchCompanyDetail` wire operation owns its GET replay. Use
`company-detail` for supported detail retrieval and normalization;
`company-rss` remains responsible for company RSS.
