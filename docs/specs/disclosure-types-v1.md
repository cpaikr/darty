# Disclosure Types v1

`disclosure-types` is a static, read-only lookup over the project-owned DART
detail-code catalog. It does not call the live provider.

## Request

- `category` is optional and accepts a known category letter from `A` through
  `J`, normalized to uppercase.
- `query` is optional, non-empty text matched case-insensitively against code
  and Korean label.
- Unknown fields are rejected. With no filters, all retained categories are
  returned.

## Result

The shared success envelope contains the normalized request, matching category
groups and items, total count, source provenance, and source reference. Each
item has a code matching `^[A-J]\d{3}$` and a Korean label. When `query` returns
equal labels across multiple categories, the result includes an
`ambiguous_label_match` warning.

Failures are non-retryable `invalid_request` or `internal_error`. The canonical
catalog and its provenance live in [`crates/darty/resources/disclosure-types.json`](../../crates/darty/resources/disclosure-types.json);
[the filter-code reference](dart-filter-codes.md) explains caller usage.
