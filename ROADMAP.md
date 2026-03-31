# Roadmap

Recommendation: move from source investigation to a narrow, evidence-backed DART access tool. Keep the first release read-only, citation-focused, and centered on `dsab007` integrated filing search, with `공시통합검색 > 본문내용` as the first implemented mode.

Development style:

- ship the smallest useful capability first
- keep each phase independently reviewable
- promote only proven behavior into the public contract

## Phase 1: dsab007 Search Investigation

Deliverables:

- validated request contract for `/dsab007/search.ax`
- shared `dsab007` request field map and defaults
- mode-specific parser evidence for contents first, then corp/report-name/toc
- validated identifier map for filing, document, section, and viewer surfaces
- source constraints: auth, rate limits, anti-bot behavior, and terms notes

## Phase 2: dsab007 Core Boundary

Deliverables:

- stable DART-shaped contract for `dsab007`
- one shared execution core for `search.ax`
- first mode-specific output model for `contents`

## Phase 3: Core Implementation

Deliverables:

- `bun` + strict TypeScript + `effect` stack locked as the first implementation path
- reusable read-only core for `dsab007` search execution
- local CLI for human and script use across mode-specific commands
- fixture-backed tests for key search scenarios

## Phase 4: Search Mode Expansion

Deliverables:

- `corp` mode
- report-name mode
- TOC mode if the request/response seam is stable enough
- mode-specific tests and fixture capture

## Phase 5: Section Retrieval Expansion

Deliverables:

- deterministic filing viewer open flow from `rcpNo` and `dcmNo`
- evidence-backed section retrieval contract if the viewer identifiers prove stable enough
- follow-on tests for filing-to-section traversal
## Phase 6: Hardening And Adapters

Deliverables:

- scenario evals for citation and retrieval quality
- operational notes for source drift, partial coverage, and auth-required fallbacks
- MCP adapter only after the core contract is stable

## Intentional Deferrals

- mutation or submission flows
- authenticated account features unless they prove essential
- answer synthesis inside the tool
- official OpenDART API integration
