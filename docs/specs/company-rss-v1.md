# Company RSS v1

- `name`: `company-rss-v1`
- `domain`: DART company-specific disclosure RSS

## Public Operation

### `company-rss`

Fetches the DART company-specific disclosure RSS feed and returns a structured JSON envelope.

## Request

| Field | Required | Constraint | Notes |
|---|---:|---|---|
| `companyCode` | yes | 8 digits | DART company code, not a 6-digit stock code |
| `detail` | no | `concise`, `detailed`, or `raw` | default `concise`; controls output projection |

Unknown request fields are rejected.

## Source

- `GET https://dart.fss.or.kr/api/companyRSS.xml?crpCd={companyCode}`
- Source surface: DART `companyRSS`
- The parser treats missing channel `title` or `link`, and missing item `title` or `link`, as source-shape changes.

## Result

The success envelope contains:

- `result.request`: normalized request
- `result.channel`: RSS channel `title` and `link`; optional channel description/language/publishedAt are included for `detailed` and `raw`
- `result.items[]`: RSS items with `title`, `link`, optional 14-digit `receiptNumber`, optional `publishedAt`, optional `creator`; optional RSS `guid` is included for `detailed` and `raw`
- `metadata.fetchedAt`: fetch timestamp
- `metadata.source`: `{ system: "dart", surface: "companyRSS", endpoint }`
- `metadata.completeness`: currently `complete`
- `metadata.itemCount`: returned RSS item count
- `references.rssUrl`: requested RSS URL

## Failures

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, or contains unknown fields |
| `source_unavailable` | yes | DART RSS endpoint could not be fetched |
| `source_changed` | no | RSS structure no longer matches required parser assumptions |
| `source_parse_failure` | no | response XML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

Typed failures may include optional `recoveryHint` with a concise next action. For invalid `companyCode`, it should point callers to `search-company` to resolve the 8-digit DART company code.
