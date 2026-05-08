# dsae001 Search Company v1

## 1. Identity

- `name`: `dsae001-search-company-v1`
- `owner`: `darty`
- `status`: implemented
- `domain`: DART company overview search through `dsae001`
- `users`: LLM agents and scripts that need to resolve company names to DART company codes

## 2. Capability Boundary

This capability implements only the `회사별` slice of DART `기업개황`.

It should:

- search companies by company name through `https://dart.fss.or.kr/dsae001/search.ax`
- parse the returned HTML fragment into structured company rows
- expose the 8-digit DART company code from each result row
- include the 6-digit stock code when DART displays one

It should not yet:

- implement `업종별` search
- search by business registration number or corporate registration number
- fetch and normalize the full company detail table from `/dsae001/select.ax`
- expose market filters until the public contract is intentionally expanded

## 3. Observed Korean UI Slice

Observed UI entrypoint:

- `기업개황 > 기업개황`
- URL: `https://dart.fss.or.kr/dsae001/main.do`
- implemented tab: `회사별`

Implemented input mapping:

| Korean DART UI | Public input | Internal `/dsae001/search.ax` replay field | Status |
|---|---|---|---|
| tab `회사별` | fixed capability choice | form defaults for company search | implemented; not caller-configurable |
| `검색조건 선택=회사명` | fixed capability choice | `searchType=1` | implemented; not caller-configurable |
| `검색어입력` | `companyName` | `textCrpNm` | implemented and required |
| result page | `page` | `currentPage` | implemented; default `1` |
| result page size | `pageSize` | `maxResults` | implemented; default `15`, max `45` |
| company-type checkboxes `유가`, `코스닥`, `코넥스`, `기타` | fixed all-company search | `corpType=P/A/X/E`, `corpTypeAll=all` | implemented as all selected; not caller-configurable |

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

- `companyName` (required): company-name query, minimum 2 characters
- `page` (optional): 1-based page number, default `1`
- `pageSize` (optional): number of rows to request, default `15`, maximum `45`

Output envelope:

- `result.request`: normalized request
- `result.pagination`: current page, total pages, total count, returned count
- `result.items[]`: company rows with `companyCode`, `companyName`, optional `stockCode`, market label/kind, detail references, and raw evidence
- `metadata`: DART source endpoint, observed behavior, completeness, and dropped row count
- `references.searchUrl`: source POST endpoint
- `warnings`: partial row drops if parsing failed for individual rows

Failures:

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, or contains unknown fields |
| `source_unavailable` | yes | DART search endpoint could not be fetched |
| `source_changed` | no | company search HTML no longer matches required parser assumptions |
| `source_parse_failure` | no | response HTML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

## 6. Source Replay Notes

Observed POST endpoint:

- `https://dart.fss.or.kr/dsae001/search.ax`

Observed company-name replay fields:

- `currentPage`
- `maxResults`
- `maxLinks=10`
- `searchType=1`
- `textCrpNm={companyName}`
- `businessCode=all`
- `corpTypeAll=all`
- `corpType=P`, `A`, `X`, `E`
- supporting empty fields such as `selectKey`, `searchIndex`, `textCrpCik`, `bsnRgsNo`, and `crpRgsNo`

Observed detail endpoint after selecting a row:

- `POST /dsae001/select.ax` with `selectKey={companyCode}`

The current public capability returns a `detailEndpoint` reference but does not fetch or normalize the detail table. Use the separate `company-detail` command for detail normalization and `company-rss` for company RSS.
