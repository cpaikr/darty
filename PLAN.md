# Active Plan

Current job: make the public `contents-search` input contract schema-first so the capability, CLI, and future MCP adapter share one authoritative request model.

## Goal

- define the public semantic request as an annotated `Effect Schema`
- derive CLI-facing property docs and JSON Schema from that public schema
- keep the existing capability error taxonomy while removing duplicated defaults, enum lists, ranges, and patterns from the resolver
- keep transport behavior unchanged apart from consuming schema-derived metadata

## In Scope

- add capability-level schema annotation and property-description helpers
- replace the custom `contents-search` manifest input model with a schema-backed one
- update the CLI to parse option types from schema-derived property docs
- update tests to cover the schema-first contract and derived JSON Schema

## Out Of Scope

- MCP server implementation
- new DART operations beyond `contents-search`
- a generic parse-error-to-capability-error framework for every future capability
- source-layer replay-schema refactors

## Work Plan

- [x] Replace the custom public input manifest model with annotated schema helpers and derived property docs/JSON Schema
- [x] Refactor `contents-search` contract/spec to make the schema authoritative for input defaults and constraints
- [x] Update the CLI to consume derived input docs from the schema-backed manifest
- [x] Adjust tests to cover the schema-first public contract and preserved request errors
- [x] Run typecheck and tests

## Verification

- `bun run typecheck`
- `bun test`

## Exit Criteria

- the public `contents-search` input contract lives in one annotated schema
- CLI flags/help/examples derive from schema-owned property docs rather than a separate manifest-only model
- the exported machine-readable schema is generated from the public capability schema
- request validation no longer restates defaults, choice lists, ranges, or date patterns as separate constants
