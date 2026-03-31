# Roadmap

Recommendation: move from source investigation to a narrow, evidence-backed DART access tool. Keep the first release read-only and citation-focused.

## Phase 1: Surface Investigation

Deliverables:

- request and route inventory for `dart.fss.or.kr`
- request and route inventory for `opendart.fss.or.kr`
- validated identifier map for company, filing, document, section, and download surfaces
- source constraints: auth, rate limits, anti-bot behavior, and terms notes

## Phase 2: Capability Boundary

Deliverables:

- explicit v1 source policy: DART only, OpenDART only, or hybrid
- stable public reference model for company, filing, document, and section retrieval
- v1 operation set shaped around agent tasks, not UI flows

## Phase 3: Core Implementation

Deliverables:

- reusable read-only core against the validated source surface
- local CLI for human and script use
- fixture-backed tests for key search and retrieval scenarios

## Phase 4: Hardening And Adapters

Deliverables:

- scenario evals for citation and retrieval quality
- operational notes for source drift, partial coverage, and auth-required fallbacks
- MCP adapter only after the core contract is stable

## Intentional Deferrals

- mutation or submission flows
- authenticated account features unless they prove essential
- broad multi-source abstraction beyond DART/OpenDART
- answer synthesis inside the tool
