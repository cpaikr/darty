# Specifications

This directory owns stable, evidence-backed capability and transport
contracts. Product direction belongs in [VISION.md](../../VISION.md); open-ended
source investigation belongs in [research](../research/).

## Implementation status

“Shipped” means the active TypeScript npm product. “Candidate” means the
unpublished Rust/Node/CLI implementation retained under `crates/` and
`candidate/npm/`.

| Contract | Shipped | Candidate |
|---|---:|---:|
| [CLI transport v1](cli-transport-v1.md) | all 8 operations | 3-operation compatibility subset |
| [Company search](dsae001-search-company-v1.md) | yes | yes |
| [Company filing search](dsab007-search-company-reports-v1.md) | yes | yes |
| [Report viewing](dsaf001-view-report-v1.md) | yes | yes |
| [Body-content search](dsab007-search-v1.md) | yes | not yet |
| [Company detail](dsae001-company-detail-v1.md) | yes | not yet |
| [Company RSS](company-rss-v1.md) | yes | not yet |
| [DART filter codes](dart-filter-codes.md) | yes | partial through company filing search |

`disclosure-types` and `report-guide` are shipped static operations not yet in
the retained candidate. [The active plan](../../plans/rust-sdk-node-sdk-cli-rewrite.md)
owns the phase gates and per-operation sequencing; no fixed port order is
approved, so the list above is scope rather than a schedule. Each newly ported
source-backed operation also requires provider requalification and an explicit
maintainer approval before it can satisfy the Phase 3 gate. The Phase 4
platform/cutover gate repeats that review for the complete source-backed set.
Record those decisions only in the canonical [provider qualification approval
records](../research/dart-provider-qualification.md#maintainer-approval-records);
the current provider document contains no approval entries.

## Wire authority

- [dart-wire-v1.openapi.yaml](dart-wire-v1.openapi.yaml) is the sole HTTP,
  query, and form authority for the currently specified three-operation
  vertical subset. Remaining ports must extend the authority before relying on
  it.
- [dart-html-viewer-v1.md](dart-html-viewer-v1.md) is the companion authority
  for decoding and HTML/viewer behavior OpenAPI cannot express.
- [CLI transport v1](cli-transport-v1.md) is the process compatibility
  authority for both the shipped CLI and candidate commands.

The shipped TypeScript implementation predates full wire conformance. Its
`bun run check:dart-wire` coverage validates the canonical documents, locks,
selected parsers, and POST serializers; it does not claim that all eight
TypeScript operations use the canonical wire subset.

The deterministic `dart-wire-v1.lock.json` couples canonical documents,
provider qualification, and fictional fixture evidence. Run
`bun run check:dart-wire` after editing any locked input.
