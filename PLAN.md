# Active Plan

Current job: replace the public `dsab007-contents` DART-shaped tool contract with a semantic, shared input layer while keeping the internal replay adapter intact.

## Goal

Centralize defaults, validation, and structured input errors for `dsab007-contents` so CLI, future MCP, and future SDK layers can share one semantic operation contract.

## In Scope

- Add a semantic raw/resolved input layer for `dsab007-contents`
- Add structured domain validation errors for operation input resolution
- Map resolved semantic input into the existing internal DART replay contract
- Update the CLI to expose only semantic flags and reject invalid domain input before execution
- Make operation metadata derive from the semantic contract instead of a duplicated required/default table
- Update tests to match the new semantic public surface

## Out Of Scope

- MCP implementation
- SDK implementation
- Broad redesign of unrelated `dsab007` client or parser modules
- Multi-operation planning beyond `dsab007-contents`

## Work Plan

- [x] Review current CLI, operation metadata, and internal DART contract seams
- [x] Add semantic input definitions, defaults, and structured resolution errors
- [x] Add semantic-to-DART mapping and wire execution through it
- [x] Switch CLI parsing/help/tests to semantic names only
- [x] Derive operation metadata from the semantic input definition
- [x] Run targeted tests and update this plan with results

## Progress

- Added a semantic `dsab007-contents` input module with:
  raw input, resolved input, structured validation errors, internal DART mapper, and semantic result echoing
- Added a shared semantic operation executor so CLI and future transports can reuse the same resolve -> replay -> result-shaping flow
- Rewired the CLI so Commander handles only flag syntax while the shared operation layer handles required fields, defaults, choices, date format, and result shaping
- Removed raw DART-shaped public aliases from the CLI and shared operation help
- Updated command output to echo the resolved semantic request instead of the internal DART replay input
- Re-scoped the old DART-shaped probe catalog as an internal replay contract rather than a public tool contract
- Added semantic resolver, operation executor, replay-contract, CLI unit, and CLI subprocess coverage

## Verification

- `bun run typecheck`
- `bun test src/tools/operations/dsab007-contents-input.test.ts src/tools/operations/dsab007-contents-operation.test.ts src/cli/commands/search-dsab007.test.ts test/cli/dsab007-contents-cli.test.ts src/dart/dsab007/replay-contract.test.ts`

## Exit Criteria

- The public `dsab007-contents` CLI no longer exposes raw DART-shaped aliases
- Defaults and validation come from one shared semantic resolver
- Invalid semantic input is rejected before any network execution
- Internal DART replay details remain isolated behind a mapper
- The low-level DART probe catalog is clearly internal replay coverage, not the public tool contract
- Tests cover the new semantic contract, shared execution path, and internal replay seam
