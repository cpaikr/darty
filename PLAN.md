# Plan

Current job: refactor the first implementation slice around `dsab007` as the primary DART search surface.

## Goal

Turn the first working contents-mode slice into a shared `dsab007` search core with DART-shaped contracts, a shared request/client seam, and a mode-specific contents parser on top.

## Deliverable

- shared `dsab007` contracts and request builder
- a `contents` parser that sits under the shared `dsab007` core
- CLI wiring that targets the `dsab007` surface instead of a one-off semantic body-search command
- docs and specs updated to treat `dsab007` as the main unit

## In Scope

- keep the stack intact
- refactor the source tree around `src/dart/dsab007`
- expose DART-shaped request fields more explicitly than the first semantic body-search slice did
- keep `contents` as the only implemented mode for now
- preserve read-only behavior

## Out Of Scope

- transport adapters beyond a local CLI
- authenticated workflows
- implementing every `dsab007` mode in this step
- section-level retrieval
- broad financial statement normalization
- Playwright fallback

## Inputs

- the current search contract in [docs/specs/dsab007-search-v1.md](docs/specs/dsab007-search-v1.md)
- the current source map in [docs/research/dart-source-map.md](docs/research/dart-source-map.md)
- the first implementation slice in `src/` and `test/`

## Work Plan

1. Introduce shared `dsab007` contracts and request-building code.
2. Move the current contents implementation under `src/dart/dsab007/parsers/contents.ts`.
3. Rename the CLI and output model around `dsab007-contents`.
4. Update docs/specs to treat `dsab007` as the main capability surface.
5. Re-run typecheck, tests, and one live CLI check.

## Open Questions

- How far should the public `dsab007` contract go toward raw DART form fields before a higher-level wrapper is added?
- Which `dsab007` mode should be implemented second once the shared core is stable?

## Exit Criteria

- `src/` is organized around `dsab007`, not one semantic body-search flow
- the first mode still works live after the refactor
- docs and code agree that `contents` is the first implemented mode, not the full architecture
