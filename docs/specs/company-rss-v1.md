# Company RSS v1

- `name`: `company-rss-v1`
- `status`: implemented
- `domain`: DART company-specific disclosure RSS

## Public Operation

### `company-rss`

Fetches the DART company-specific disclosure RSS feed and returns a structured JSON envelope.

## Request

| Field | Required | Constraint | Notes |
|---|---:|---|---|
| `companyCode` | yes | 8 digits | DART company code, not a 6-digit stock code |

Unknown request fields are rejected.

## Source

- `GET https://dart.fss.or.kr/api/companyRSS.xml?crpCd={companyCode}`
- Source surface: DART `companyRSS`
- The parser treats missing channel `title` or `link`, and missing item `title` or `link`, as source-shape changes.

## Result

The success envelope contains:

- `result.request`: normalized request
- `result.channel`: RSS channel `title`, `link`, optional `description`, optional `language`, optional `publishedAt`
- `result.items[]`: RSS items with `title`, `link`, optional 14-digit `receiptNumber`, optional `publishedAt`, optional `creator`, optional `guid`
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
