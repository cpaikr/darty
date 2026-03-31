# Plan

Current job: harden the first filing-level search slice after the initial `bun` + TypeScript + `effect` scaffold.

## Goal

Turn the first working search slice into a more reliable filing-level contract by tightening result normalization and grounding tests in captured live HTML.

## Deliverable

- clearer normalization rules for report title, subtitle, and attachment rows
- live HTML fixtures for at least one populated response and one no-result response
- any schema adjustments required by that hardening work

## In Scope

- keep the stack and current source tree intact
- inspect live rows that mix filing titles with attachment labels
- decide whether `report_title` and `report_subtitle` are sufficient or need one more normalized field
- add fixture-backed tests from real DART HTML, not only inline snippets
- keep the code read-only and filing-level only

## Out Of Scope

- transport adapters beyond a local CLI
- authenticated workflows
- full reverse engineering of every search mode
- section-level retrieval
- broad financial statement normalization
- Playwright fallback

## Inputs

- the current search contract in [docs/specs/dart-body-search-v1.md](docs/specs/dart-body-search-v1.md)
- the current source map in [docs/research/dart-source-map.md](docs/research/dart-source-map.md)
- the first implementation slice in `src/` and `test/`

## Work Plan

1. Capture one populated and one empty DART body-search HTML fixture from the live site.
2. Review title and attachment-row patterns against those fixtures.
3. Tighten the parser and result schema where the current normalization is lossy.
4. Expand tests to assert the hardened behavior on captured fixtures.
5. Re-run typecheck, tests, and one live CLI check.

## Open Questions

- Is `snippetHtml` durable enough to keep public, or should it be demoted once the parser is more stable?
- Should attachment rows become a separate normalized field instead of being folded into `reportTitle`?

## Exit Criteria

- fixture-backed tests cover real populated and empty search responses
- attachment-row normalization is explicit instead of incidental
- the core result model is still filing-level and read-only
