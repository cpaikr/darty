# Specs

This directory is for stable, evidence-backed capability specs.

A document belongs here when it defines an implementation target, such as:

- a v1 operation set
- request and response schemas
- identifier and citation rules
- explicit errors, warnings, and constraints
- active transport contracts such as CLI subprocess I/O

Current specs:

- [cli-transport-v1.md](cli-transport-v1.md)
- [dart-wire-v1.openapi.yaml](dart-wire-v1.openapi.yaml), the sole HTTP/form/query authority for the supported DART vertical subset
- [dart-html-viewer-v1.md](dart-html-viewer-v1.md), the sole companion authority for decoding and HTML/viewer grammar that OpenAPI cannot express
- [company-rss-v1.md](company-rss-v1.md)
- [dart-filter-codes.md](dart-filter-codes.md)
- [dsae001-company-detail-v1.md](dsae001-company-detail-v1.md)
- [dsae001-search-company-v1.md](dsae001-search-company-v1.md)
- [dsab007-search-company-reports-v1.md](dsab007-search-company-reports-v1.md)
- [dsab007-search-v1.md](dsab007-search-v1.md)
- [dsaf001-view-report-v1.md](dsaf001-view-report-v1.md)

Do not put product vision or open-ended investigation notes here. Keep product direction in the repo root and source investigation under `docs/research/`.

The deterministic lock in `dart-wire-v1.lock.json` makes canonical documents,
provider qualification, and fictional fixture evidence change together. Run
`bun run check:dart-wire` after editing any of them.
