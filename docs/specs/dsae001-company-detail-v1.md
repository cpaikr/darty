# dsae001 Company Detail v1

- `name`: `dsae001-company-detail-v1`
- `status`: implemented
- `domain`: DART company overview detail lookup

## Public Operation

### `company-detail`

Fetches the DART company overview detail fragment for one DART company code and returns normalized company fields.

## Request

| Field | Required | Constraint | Notes |
|---|---:|---|---|
| `companyCode` | yes | 8 digits | DART company code, not a 6-digit stock code |

Unknown request fields are rejected.

## Source

- `GET https://dart.fss.or.kr/dsae001/select.ax?selectKey={companyCode}`
- Source surface: DART `dsae001`
- Parsed table: `#corpDetailTable`
- An empty recognized detail table is treated as `not_found`; a missing detail table is treated as `source_changed`.

## Result

The success envelope contains:

- `result.request`: normalized request
- `result.company.companyCode`: requested DART company code
- `result.company.companyName`: normalized company name from DART
- Optional company fields when DART provides them: `englishName`, `disclosureCompanyName`, `stockCode`, `representativeName`, `corporationKind`, `corporateRegistrationNumber`, `businessRegistrationNumber`, `address`, `homepage`, `phoneNumber`, `faxNumber`, `industryName`, `establishedDate`, `fiscalMonth`
- `metadata.fetchedAt`: fetch timestamp
- `metadata.source`: `{ system: "dart", surface: "dsae001", endpoint }`
- `metadata.completeness`: currently `complete`
- `references.detailUrl`: requested detail URL

## Failures

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, or contains unknown fields |
| `not_found` | no | DART returned a recognized empty detail response for the requested company code |
| `source_unavailable` | yes | DART detail endpoint could not be fetched |
| `source_changed` | no | detail HTML no longer matches required parser assumptions |
| `source_parse_failure` | no | response HTML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

Typed failures may include optional `recoveryHint` with a concise next action. For invalid or unknown `companyCode`, it should point callers to `search-company` to resolve the 8-digit DART company code.
