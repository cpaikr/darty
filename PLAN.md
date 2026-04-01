# Active Plan

Current job: rename the public contents-search surface so `dsab007` stays at the adapter boundary instead of leaking through semantic command, operation, and symbol names.

## Goal

Keep defaults, validation, and structured input errors centralized for the semantic contents-search capability while preserving `src/dart/dsab007` as the internal replay adapter.

## In Scope

- Rename the public CLI command from `dsab007-contents` to `contents-search`
- Rename semantic operation modules and symbols to drop `dsab007`
- Keep `src/dart/dsab007` as the upstream-specific module boundary
- Add structured domain validation errors for operation input resolution
- Map resolved semantic input into the existing internal DART replay contract
- Update the CLI to expose only semantic flags and reject invalid domain input before execution
- Make operation metadata derive from the semantic contract instead of a duplicated required/default table
- Update tests to match the new semantic public surface

## Out Of Scope

- MCP implementation
- SDK implementation
- Broad redesign of unrelated `dsab007` client or parser modules
- Multi-operation planning beyond contents search

## Work Plan

- [x] Review current CLI, operation metadata, and internal DART contract seams
- [x] Add semantic input definitions, defaults, and structured resolution errors
- [x] Add semantic-to-DART mapping and wire execution through it
- [x] Switch CLI parsing/help/tests to semantic names only
- [x] Derive operation metadata from the semantic input definition
- [x] Run targeted tests and update this plan with results

## Progress

- Renamed the public semantic capability to `contents-search` while leaving the upstream adapter under `src/dart/dsab007/`
- Renamed the semantic input, operation, and CLI modules to `contents-search*`
- Removed `Dsab007`/`dsab007` prefixes from module-local exports inside `src/dart/dsab007/`
- Kept low-level replay behavior and upstream URLs explicit at the adapter boundary
- Preserved the semantic input module with:
  raw input, resolved input, structured validation errors, internal DART mapper, and semantic result echoing
- Added a shared semantic operation executor so CLI and future transports can reuse the same resolve -> replay -> result-shaping flow
- Rewired the CLI so Commander handles only flag syntax while the shared operation layer handles required fields, defaults, choices, date format, and result shaping
- Removed raw DART-shaped public aliases from the CLI and shared operation help
- Updated command output to echo the resolved semantic request instead of the internal DART replay input
- Re-scoped the old DART-shaped probe catalog as an internal replay contract rather than a public tool contract
- Added semantic resolver, operation executor, replay-contract, CLI unit, and CLI subprocess coverage

## Verification

- `bun run typecheck`
- `bun test src/tools/operations/contents-search-input.test.ts src/tools/operations/contents-search-operation.test.ts src/cli/commands/contents-search.test.ts test/cli/contents-search-cli.test.ts src/dart/dsab007/replay-contract.test.ts`

## Exit Criteria

- The public `contents-search` CLI no longer exposes raw DART-shaped aliases
- `dsab007` remains the explicit upstream adapter boundary instead of the default public prefix
- Defaults and validation come from one shared semantic resolver
- Invalid semantic input is rejected before any network execution
- Internal DART replay details remain isolated behind a mapper
- The low-level DART probe catalog is clearly internal replay coverage, not the public tool contract
- Tests cover the new semantic contract, shared execution path, and internal replay seam
