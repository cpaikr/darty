# Validation Refactor Plan

## Goal

Reduce duplicated request-validation mechanics while preserving the current architecture:

- CLI stays a shallow transport parser.
- Capability resolvers remain the semantic validation boundary.
- Effect Schema remains the schema/source-of-truth system.
- Capability-specific error classes and Korean user-facing messages stay local.

## Current State

`search-body` and `search-company-reports` duplicate several mechanics:

- input must be a plain object
- public unknown-key checks
- Effect `ParseIssue` traversal
- deterministic first-parameter selection
- `YYYYMMDD` real-calendar-date validation
- `startDate <= endDate` validation

Other capabilities validate similar concepts manually, but the first refactor should target only the duplicated search/date path.

CLI flag validation is intentionally limited:

- Commander rejects unknown flags and extra positional arguments.
- Integer flags use `parseIntegerCliOption` only for syntax conversion.
- Required fields, defaults, enum choices, ranges, date formats, and semantic constraints stay in capability resolvers.
- CLI error rendering maps semantic parameter names back to flag names.

## Design

Create a small shared helper module:

```txt
src/capabilities/request-validation.ts
```

The module should expose reusable mechanics, not product copy.

Recommended helpers:

- `assertRecordInput(input, makeError)`
  - rejects `null`, arrays, and non-objects
  - accepts an error factory so each capability owns the error class/message

- `assertNoUnknownKeys(input, allowedKeys, makeError)`
  - rejects keys outside the public capability contract
  - keeps unknown-parameter messages local through an error factory

- `collectParseIssues(issue)`
  - recursively unwraps Effect `Pointer`, `Composite`, `Refinement`, and `Transformation` issues
  - returns `{ path, issue }[]`

- `getFirstParameterIssues(parseError, orderedKeys)`
  - chooses the first invalid parameter in public field order
  - returns `{ parameter, issues }`

- `isRealYYYYMMDDDate(value)`
  - validates that a `YYYYMMDD` string is an actual calendar date

- `assertYYYYMMDDDateRange(request, options)`
  - validates `startDate` and `endDate` as real dates
  - validates start is not after end
  - receives local error factories for invalid start date, invalid end date, and reversed range

Keep the helper API boring and data-oriented. Avoid a generic validation framework or shared message registry.

## Implementation Steps

1. Add `src/capabilities/request-validation.ts`.
2. Move the duplicated Effect parse-issue traversal from both search resolvers into the shared helper.
3. Move `isRealYYYYMMDDDate` and date-range checking into the shared helper with capability-local error factories.
4. Replace `search-body` resolver duplication with helper calls.
5. Replace `search-company-reports` resolver duplication with helper calls.
6. Keep each resolver's `toInvalid...Request` mapping local because field kinds and messages differ.
7. Do not change CLI flag definitions or Commander behavior in this refactor.
8. Do not migrate to Zod.

## Validation and Tests

Run:

```bash
bun run typecheck
bun test
```

Tests that should remain green without behavior changes:

- `src/capabilities/search-body/contract.test.ts`
- `src/capabilities/search-company-reports/contract.test.ts`
- `src/cli/commands/search-body.test.ts`
- `src/cli/commands/search-company-reports.test.ts`

Add focused tests for the shared helper only if behavior is not already covered through resolver tests. Prefer resolver-level tests for user-facing behavior.

## Non-Goals

- No Zod migration.
- No shared capability error class.
- No centralized Korean validation copy.
- No CLI `.choices()` migration in this change.
- No broad rewrite of `search-company`, `company-detail`, `company-rss`, or `view-report` unless a tiny follow-up cleanup is clearly safe.

## Follow-Up Options

After the first refactor lands, consider separately:

- normalizing simpler resolvers onto the shared plain-object and unknown-key helpers
- removing unused `zod` from dependencies if no planned use remains
- documenting the validation boundary in `src/ARCHITECTURE.md` only if the implementation meaningfully changes
