# Roadmap

Recommendation: move from source investigation to a narrow, evidence-backed DART access tool. Keep the first release read-only, citation-focused, and centered on `공시통합검색 > 본문내용`.

Development style:

- ship the smallest useful capability first
- keep each phase independently reviewable
- promote only proven behavior into the public contract

## Phase 1: Body Search Investigation

Deliverables:

- validated request contract for `/dsab007/search.ax`
- response parser for result count, rows, and pagination
- validated identifier map for filing, document, section, and viewer surfaces
- source constraints: auth, rate limits, anti-bot behavior, and terms notes

## Phase 2: Capability Boundary

Deliverables:

- stable public reference model for semantic query inputs and filing-level search hits
- v1 operation set shaped around body-content search and filing-level retrieval only

## Phase 3: Core Implementation

Deliverables:

- `bun` + strict TypeScript + `effect` stack locked as the first implementation path
- reusable read-only core for semantic body-content search
- local CLI for human and script use
- fixture-backed tests for key search scenarios

## Phase 4: Section Retrieval Expansion

Deliverables:

- deterministic filing viewer open flow from `rcpNo` and `dcmNo`
- evidence-backed section retrieval contract if the viewer identifiers prove stable enough
- follow-on tests for filing-to-section traversal
## Phase 5: Hardening And Adapters

Deliverables:

- scenario evals for citation and retrieval quality
- operational notes for source drift, partial coverage, and auth-required fallbacks
- MCP adapter only after the core contract is stable

## Intentional Deferrals

- mutation or submission flows
- authenticated account features unless they prove essential
- answer synthesis inside the tool
- official OpenDART API integration
