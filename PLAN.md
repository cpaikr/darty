# Active Plan

Current job: finish the `contents-search` provider boundary so the capability layer is free of source imports and provider errors are normalized before they cross the seam.

## Goal

Finish the boundary refactor:

- transports depend only on a stable semantic capability contract
- the capability depends on a capability-owned provider port and provider result
- provider errors are normalized before they reach the capability executor
- DART replay fields, source page models, and default provider wiring stay outside `src/capabilities/`

## In Scope

- Remove remaining `src/sources/*` imports from `src/capabilities/contents-search/`
- Add a capability-owned provider error and normalize `dsab007` failures into it
- Move default provider wiring into a small composition root outside the capability layer
- Update tests and nearby docs to reflect the tighter seam

## Out Of Scope

- MCP implementation
- New DART operations beyond `contents-search`
- Viewer or section retrieval redesign
- Broad schema unification across all capabilities

## Work Plan

- [x] Confirm the remaining leak and restate the targeted refactor scope
- [x] Remove source imports from `src/capabilities/contents-search/`
- [x] Add a capability-owned provider error and normalize `dsab007` failures into it
- [x] Move default provider wiring outside the capability layer
- [x] Update tests/docs and rerun typecheck/tests

## Progress

- Reused the existing root `PLAN.md` instead of creating another competing plan file
- Moved the public surface under `src/capabilities/contents-search/`
- Moved the DART replay adapter under `src/sources/dart/dsab007/contents/`
- Removed the old `src/tools/operations/` public seam
- Narrowed the public input contract to:
  `page`, `sortBy`, `sortDirection`, `keyword`, `startDate`, `endDate`, optional `companyCode`, `presenterName`, and `reportName`
- Removed caller-facing `limit`, `maxLinks`, and `companyName` from the public contract because they are not robust external controls for the current source behavior
- Replaced the public result with a capability-owned envelope:
  `result`, `metadata`, `references`, `warnings`
- Split public items from source rows so parser-owned fields now sit under `evidence` and `references` rather than leaking through as the default API
- Added row-level partial parsing in the DART adapter with dropped-row warnings instead of unconditional whole-request failure
- Added capability-owned structured failure mapping so CLI and future MCP transports do not depend on source-adapter error types
- Moved semantic-to-replay mapping behind a source-adapter entrypoint instead of keeping raw DART field translation in the capability executor
- Added explicit observed upstream paging metadata to the public result envelope
- Rewired the CLI to import only the public capability contract and metadata
- Updated the architecture and spec docs to describe one external semantic contract and one internal replay contract
- Post-implementation review showed one remaining leak: the capability executor still depended on `SourceContentsSearchPage`, so capability tests had to mock DART-shaped pages directly
- The next step is to replace that seam with a capability-owned provider result and move source-page mapping into the `dsab007` adapter
- Added `src/capabilities/contents-search/provider.ts` so the capability now owns the provider port and result shape used by transports and adapters
- Moved source-row and source-page mapping into `src/sources/dart/dsab007/contents/search.ts`, so the `dsab007` adapter now owns both replay translation and source-to-provider translation
- Simplified capability tests so they now mock provider-owned results instead of DART-shaped parsed pages
- Added `internal_error` to the capability failure taxonomy so unexpected internal bugs are no longer mislabeled as source parse failures
- Updated architecture/spec docs to describe the provider seam explicitly
- Post-implementation review showed two remaining leaks: `src/capabilities/contents-search/execute.ts` still imported `dsab007` as the default provider, and capability failure mapping still depended on source-adapter error classes
- The last cleanup step is to normalize provider errors at the provider boundary and move default provider selection into a composition module outside `src/capabilities/`
- Added `ContentsSearchProviderError` in `src/capabilities/contents-search/provider.ts`, so providers now normalize retryability and failure shape before crossing the seam
- Removed all `src/sources/*` imports from `src/capabilities/contents-search/` and made capability execution fully provider-injected
- Added `src/app/contents-search.ts` as the composition root that wires the default `dsab007` provider for CLI and other hosts
- Updated source-adapter tests to cover provider-error normalization and capability tests to use provider-owned errors instead of DART-specific error classes

## Verification

- `bun run typecheck`
- `bun test`

## Exit Criteria

- `src/capabilities/contents-search/*` no longer imports from `src/sources/*`
- Provider errors are capability-owned rather than source-adapter error classes
- Default provider selection happens outside the capability layer
- Capability tests no longer need DART-specific imports for error cases
- Docs still describe one external contract and one internal replay contract
