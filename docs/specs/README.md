# Specifications

This directory owns stable, evidence-backed capability and transport
contracts. [ARCHITECTURE.md](../../ARCHITECTURE.md) owns implementation status,
[ROADMAP.md](../../ROADMAP.md) owns delivery, and
[`docs/research/`](../research/) owns non-normative source observations.

## Capability contracts

- [Company search](dsae001-search-company-v1.md)
- [Company filing search](dsab007-search-company-reports-v1.md)
- [Report viewing](dsaf001-view-report-v1.md)
- [Body-content search](dsab007-search-v1.md)
- [Company detail](dsae001-company-detail-v1.md)
- [Company RSS](company-rss-v1.md)
- [Disclosure-type lookup](disclosure-types-v1.md)
- [Report guide](report-guide-v1.md)
- [DART filter-code reference](dart-filter-codes.md)

## Transport and wire authority

- [CLI transport v1](cli-transport-v1.md) owns process arguments, stdout,
  stderr, exits, and discovery compatibility.
- [dart-wire-v1 OpenAPI](dart-wire-v1.openapi.yaml) is the sole HTTP, query,
  and form authority for all source-backed operations, including the separate
  shell and content calls used by report viewing.
- [DART HTML/viewer companion](dart-html-viewer-v1.md) owns decoding and source
  grammar that OpenAPI cannot express.

The Rust implementation owns that authority, with historical TypeScript
baseline differences recorded in the companion. Repository cutover and artifact
validation remain in progress; Rust is unpublished. The deterministic lock couples canonical documents,
provider qualification, scripts, and fictional fixture evidence.

Run after changing any locked input:

```bash
bun run check:dart-wire
```
