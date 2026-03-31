# Plan

Current job: implement the second `dsab007` search mode after `contents`.

## Goal

Extend the shared `dsab007` search core to one more mode without regressing the current `contents` implementation.

## Deliverable

- one additional implemented `dsab007` mode, likely `corp` or report-name
- mode-specific request contract, parser, and result model on top of the shared client seam
- fixture-backed tests for the new mode plus at least one live replay check if the source remains anonymously reachable
- docs updated where the new mode changes the evidence-backed contract

## In Scope

- choose the second mode based on current source evidence and implementation cost
- reuse the current shared `dsab007` request/fetch seam where it still fits
- add only the mode-specific fields and parser behavior required by the chosen mode
- preserve the current read-only, citation-first contract stance
- capture any new source quirks in nearby docs or specs

## Out Of Scope

- viewer or section-retrieval work
- browser automation unless anonymous replay stops working
- premature unification across unimplemented modes
- broad CLI redesign unrelated to the second mode

## Inputs

- the shared `dsab007` core now lives under `src/dart/dsab007`
- `contents` has both fixture-backed parser tests and opt-in live replay tests
- current source evidence is in `docs/research/dart-source-map.md`
- current contract stance is in `docs/specs/dsab007-search-v1.md`

## Work Plan

1. Compare `corp` and report-name search against the existing `contents` request contract and choose the mode with the cleanest evidence-backed seam.
2. Add the chosen mode's request schema and form-building differences without weakening the current `contents` boundary.
3. Capture one or more representative live HTML fragments for the new mode and turn them into reviewable parser fixtures.
4. Implement the mode-specific parser and output model, preserving raw DART-facing fields where aggressive normalization would hide important structure.
5. Add deterministic tests first, then one opt-in live replay test if the mode stays anonymous and replayable.
6. Update docs/specs for any mode-specific quirks, shared-field differences, or limits discovered during implementation.

## Open Questions

- Should the second mode be `corp` because it is likely closer to the main integrated-search surface, or report-name because it may share more row structure with `contents`?
- Which request fields are mode-specific enough to keep out of the shared public contract until more modes exist?

## Exit Criteria

- one second `dsab007` mode works through the shared client seam
- the new mode has fixture-backed tests and at least one opt-in live replay test when feasible
- the docs and spec identify any new mode-specific quirks that callers must know
- the current `contents` tests still pass unchanged
