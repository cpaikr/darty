# dsab007 Body-content Search v1

`search-body` searches submitted DART document contents through the integrated
`dsab007` `option=contents` surface. It is read-only and returns filing
identifiers needed for later retrieval. Other integrated-search modes and
report viewing are outside this capability.

## Request

| Field | Required | Contract |
|---|---:|---|
| `keyword` | yes | Non-empty DART body-search expression |
| `startDate`, `endDate` | yes | Valid `YYYYMMDD` dates with start not after end |
| `page` | no | Integer 1–100; default 1 |
| `sortBy` | no | `date` or `reportName`; default `date` |
| `sortDirection` | no | `asc` or `desc`; default `desc` |
| `companyCode` | no | 8-digit DART company code |
| `presenterName`, `reportName` | no | Non-empty narrowing text |
| `detail` | no | `concise`, `detailed`, or `raw`; default `concise` |

Unknown fields are rejected. The keyword is passed to DART, whose documented
syntax includes space for AND, `|` for OR, `!` for NOT, and quotes for an exact
phrase. The operation does not expose synonym expansion, body/attachment
selection, disclosure-type filters, page size, popup automation, or free-text
company lookup.

Low-level fields such as `option`, `currentPage`, `sort`, `sortType`,
`textCrpCik`, duplicated `b_*` fields, and fixed paging values are internal.
`toDsab007ContentsReplayInput()` is the boundary between semantic input and
source replay.

## Result

The shared success envelope contains:

- `result.request`: normalized semantic request;
- `result.pagination`: current page, total pages/count, and returned count;
- `result.items[]`: company, filing, match, and item references;
- `metadata`: fetch time, `dsab007` source, observed paging behavior,
  completeness, and dropped-row count;
- `references.searchUrl` and explicit warnings.

Each item includes company name and optional 8-digit company code; 14-digit
receipt number, optional source document number, normalized report title, and
receipt date; match snippet and optional disclosure/content/presenter labels;
and a DART viewer URL. Detailed/raw projections add bounded row-level evidence
such as raw report text, info text, and snippet HTML. They never expose the
complete upstream response body.

`partial_rows_dropped` reports recognized rows that could not be mapped.
`no_results` is a successful empty search with guidance to widen the date range
or remove optional filters.

## Failures

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | Semantic input is invalid or unknown |
| `source_unavailable` | yes | Bounded DART transport failed |
| `source_changed` | no | Required result/pagination grammar changed |
| `source_parse_failure` | no | Source bytes or HTML could not be decoded/parsed safely |
| `internal_error` | no | Unexpected provider or implementation failure |

Failures may include a concise recovery hint when a safe next step is known,
such as resolving `companyCode` with `search-company`.

## Source and ownership

The adapter posts internal replay fields to `/dsab007/search.ax`, accepts an
HTML fragment, and treats effective page size and pager width as
upstream-controlled. Source observations and Korean UI mappings live in
[`dart-source-map.md`](../research/dart-source-map.md); they are evidence, not
public contract. `view-report` owns TOC/document retrieval and every raw viewer
locator.

Implementation status and port sequencing live in
[ARCHITECTURE.md](../../ARCHITECTURE.md) and the
[active plan](../../plans/rust-sdk-node-sdk-cli-rewrite.md).
