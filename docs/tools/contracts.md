# Tool contracts

A contract should make invalid use difficult and the next valid action clear.

## Inputs

- Prefer semantic fields such as `companyCode`, `receiptNumber`, and date
  bounds over one overloaded query string.
- Bound pages, sizes, offsets, content windows, and enumerations.
- Keep upstream field names inside the source adapter unless they are durable
  domain identifiers.
- Avoid mode switches that silently change result type.

## Outputs

Use the product's shared envelope where the operation supports it:

- `result`: the structured payload;
- `metadata`: source and completeness context;
- `references`: stable identifiers and source URLs;
- `warnings`: recoverable uncertainty or partial coverage;
- `error`: a typed failure with retryability and recovery guidance.

Detail modes may expose additional evidence, but `raw` does not automatically
mean an unrestricted upstream body. The owning operation spec defines the
projection and its limits.

## Failures and references

Failures are product behavior. Use the stable codes and exact shapes owned by
[CLI transport v1](../specs/cli-transport-v1.md) and each capability spec; do
not introduce a parallel generic error vocabulary here.

References must let a caller verify or continue the workflow. Preserve DART
company codes, filing receipt numbers, document numbers, section identifiers,
and source URLs when the source provides them. Operation-specific keyword
syntax, fields, defaults, and evidence labels belong only in the relevant
[specification](../specs/README.md).
