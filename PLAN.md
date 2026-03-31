# Plan

Current job: derive the initial DART surface map and the first credible v1 boundary.

## Goal

Turn the current live observations about `dart.fss.or.kr` and `opendart.fss.or.kr` into an evidence-backed decision frame for the first tool contract.

## Deliverable

- a short source map covering the main DART site, the report viewer, and OpenDART
- an explicit list of identifier spaces already observed
- a short recommendation for what v1 should treat as public ids versus internal retrieval details
- a short list of unresolved decisions that must be answered before spec drafting

## In Scope

- confirm the public routes already visible from the home page and report viewer
- capture the report viewer's observed identifier model: `rcpNo`, `dcmNo`, `eleId`, `offset`, `length`, `tocNo`, `atocId`
- note where OpenDART is clearly adjacent and where it may overlap or diverge
- classify each source surface as likely primary, supporting, or deferred for v1
- leave the next spec step with enough clarity to draft a narrow read-only contract

## Out Of Scope

- drafting the full capability schema
- implementing transport adapters
- authenticated workflows or API key management
- full reverse engineering of every search endpoint
- broad financial statement normalization

## Inputs

- the live DART home page and search page
- the live report viewer for a representative filing
- the live OpenDART home page and API-list page
- the current `TODO.md` item that promotes this work ahead of spec drafting

## Work Plan

1. Record the main public surfaces and their visible responsibilities.
2. Record the identifier spaces already visible in HTML and viewer state.
3. Separate observed facts from likely but unverified inferences.
4. State the main design fork for v1:
   site-driven, OpenDART-driven, or hybrid.
5. Leave the next step with enough clarity to draft the first tool spec without pretending the source is simpler than it is.

## Open Questions

- Should v1 prioritize anonymous access to `dart.fss.or.kr`, OpenDART with API keys, or a hybrid contract with graceful degradation?
- Is `rcpNo` plus `dcmNo` enough for reliable section retrieval, or does the public contract need `eleId` and byte ranges too?
- Should XBRL access be a first-class v1 operation or a later extension once the filing/document contract is stable?

## Exit Criteria

- the current source map is clear enough to support a real scope discussion
- each observed identifier is classified as public candidate, internal detail, or unresolved
- the DART-vs-OpenDART boundary is explicit rather than implied
- follow-up spec work can start without redoing basic source reconnaissance
