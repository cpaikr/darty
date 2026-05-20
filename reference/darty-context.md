# Code Context

## Files Retrieved
1. `README.md` (lines 1-9) - package purpose and CLI/output contract summary.
2. `package.json` (lines 1-44) - Bun/Node tooling, scripts, deps, npm bin shape.
3. `tsconfig.json` (lines 1-18) - strict TypeScript defaults.
4. `VISION.md` (lines 1-80) - product principles for agent-friendly, reference-first tools.
5. `ARCHITECTURE.md` (lines 1-114) - repo docs ownership and runtime flow summary.
6. `src/ARCHITECTURE.md` (lines 1-122) - implementation layering and component map.
7. `src/capabilities/search-body/contract/request.ts` (lines 1-167) - public request schema, field specs, defaults.
8. `src/capabilities/search-body/contract/resolve-request.ts` (lines 1-140) - semantic validation/normalization flow.
9. `src/capabilities/search-body/contract/errors.ts` (lines 1-30) - typed request and capability failures.
10. `src/capabilities/search-body/contract/result.ts` (lines 1-160) - result envelope and item/metadata/reference shapes.
11. `src/capabilities/search-body/provider.ts` (lines 1-72) - provider interface, provider errors, result projection.
12. `src/capabilities/search-body/execute.ts` (lines 1-50) - capability execution and error mapping.
13. `src/app/search-body.ts` (lines 1-36) - reusable operation factory and default provider wiring.
14. `src/app/agent-tools.ts` (lines 1-113) - in-process agent tool definitions from shared operations.
15. `src/cli.ts` (lines 1-160) - root Commander CLI and JSON failure handling.
16. `src/cli/commands/search-body.ts` (lines 1-236) - thin command adapter, options, help examples, execution.
17. `src/cli/command-helpers.ts` (lines 1-200) - shared CLI parsing/output primitives and failure envelope types.
18. `src/sources/dart/dsab007/contents/search.ts` (lines 1-130) - source adapter maps public request to DART replay and provider result.
19. `src/sources/dart/dsab007/contents/fetch.ts` (lines 1-82) - Effect HTTP client, POST, decode/fetch/parse pipeline.
20. `src/sources/dart/dsab007/contents/build-form.ts` (lines 1-47) - explicit upstream form field builder.
21. `docs/specs/cli-transport-v1.md` (lines 1-61) - stable CLI subprocess contract.
22. `docs/specs/dsab007-search-v1.md` (lines 1-120) - evidence-backed capability spec and UI-to-contract mapping.
23. `docs/tools/foundations.md` (lines 1-86) - reusable tool design guidance.
24. `src/sources/dart/dsab007/contents/parse-html.test.ts` (lines 1-80) - fixture-based parser validation style.
25. `test/cli/search-body-cli.test.ts` (lines 1-120) - subprocess CLI smoke/contract tests.

## Key Code

- Purpose: `darty` is a read-only Korean DART disclosure search/retrieval CLI. README says command success and failure both emit one JSON envelope to stdout; help remains human-readable (`README.md` lines 1-9).
- Package/tooling: single TypeScript ESM package with Bun as package manager/dev runner, Node `>=20.18.1` for npm/npx, `bin.darty = dist/cli.js`, scripts for `build`, `typecheck`, `test`, `test:live`, and manual `search` (`package.json` lines 1-44). Uses `effect`, `@effect/platform`, `cheerio`, `commander`, `sanitize-html`; strict TS flags include `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` (`tsconfig.json` lines 1-18).
- Layering: transport -> app composition -> capability contracts/execution -> source adapters. CLI is intentionally not the app; capability layer owns request/result schemas, validation, provider interface, and normalized errors (`src/ARCHITECTURE.md` lines 20-75).
- Public API/client shape: each capability exposes an operation with `name`, `inputJsonSchema`, `resultJsonSchema`, and `execute(input)` via `src/app/*`. Example `createSearchBodyOperation(provider)` wires the default DART provider without transport coupling (`src/app/search-body.ts` lines 12-36).
- Request abstraction: request fields are described once as field specs with schema, copy, examples, required/defaulted/optional wrappers, then converted into an Effect schema and exported as encoded raw input plus resolved request type (`src/capabilities/search-body/contract/request.ts` lines 13-167).
- Validation: `resolve-request.ts` separately asserts object input, unknown keys, trims text filters, decodes Effect Schema, then adds domain checks like real YYYYMMDD date and start <= end (`src/capabilities/search-body/contract/resolve-request.ts` lines 1-140). Common helpers live in `src/capabilities/request-validation.ts` lines 1-120.
- Response abstraction: result envelope has `result`, `metadata`, `references`, and `warnings`; items preserve stable follow-up references such as `receiptNumber`, `companyCode`, `viewerUrl`, and optional parser evidence (`src/capabilities/search-body/contract/result.ts` lines 1-160). `ResponseDetail` supports progressive detail: `concise|detailed|raw`, but raw is not full source HTML (`src/capabilities/response-detail.ts` lines 1-30).
- Provider seam: capability provider is a narrow interface (`search(request) => Promise<ProviderResult>`), with typed provider errors and `buildSearchBodyResult()` doing final projection/warnings (`src/capabilities/search-body/provider.ts` lines 15-72).
- Execution: `executeSearchBody()` resolves semantic request, calls provider, and maps invalid/provider/unknown errors into a typed capability failure (`src/capabilities/search-body/execute.ts` lines 11-50).
- Source adapter: DART-specific code maps semantic `sortBy`, `sortDirection`, filters, and defaults to replay fields; provider result adds observed source behavior and completeness/warnings (`src/sources/dart/dsab007/contents/search.ts` lines 17-101). Upstream form fields are explicit and isolated (`build-form.ts` lines 1-47). Fetching uses Effect HTTP layers and typed source errors (`fetch.ts` lines 1-82).
- CLI: root `src/cli.ts` composes operations and command adapters; commands parse flags only, keep help text local, and delegate required/default/domain validation to shared capability resolver (`src/cli/commands/search-body.ts` lines 21-236). Shared CLI helpers keep Commander parse failures from exiting and define JSON failure envelope (`src/cli/command-helpers.ts` lines 1-200).
- Agent tool surface: `src/app/agent-tools.ts` derives `darty_*` function-tool definitions from the same app operations and JSON Schemas; this is the in-process/public-client shape to copy before adding extra transports.

## Architecture

Darty separates four concerns cleanly:

1. **Docs/spec/research**: root docs define purpose and ownership; `docs/research` stores observed source behavior; `docs/specs` stores stable capability and CLI contracts (`ARCHITECTURE.md` lines 20-67).
2. **Capability contract**: semantic request/result schemas, validation, typed failures, examples/copy, and JSON Schema export live under `src/capabilities/<capability>/`.
3. **App composition/client seam**: `src/app/<capability>.ts` creates a small operation object that can be called by CLI, agent tools, future SDK/MCP, or tests.
4. **Source adapter**: `src/sources/<source>/...` owns upstream request construction, HTTP, parsing, and source-error mapping. It should not leak replay-only upstream fields into public input unless they are meaningful to callers.
5. **Transport**: `src/cli/` owns flags, help, presentation, stdout/stderr discipline, and subprocess behavior only.

Tests mirror this architecture: deterministic colocated parser/contract/execute tests under `src/`, subprocess CLI tests under `test/cli`, opt-in live source tests under `test/live`. Parser tests use captured fixtures plus small inline edge-case HTML (`src/sources/dart/dsab007/contents/parse-html.test.ts` lines 1-80); CLI tests assert help, JSON failure envelope, exit codes, and empty stderr (`test/cli/search-body-cli.test.ts` lines 1-120).

## Start Here

Open `src/ARCHITECTURE.md` first. It is the best compact map of the reusable pattern landprice should copy: transport-light app operations over capability contracts over source adapters.

## Recommendations for `../landprice` docs/context markdown

- Reuse the **capability-first** shape: document landprice as semantic operations, not as a CLI scrape. Define `src/capabilities/<operation>/contract/{request,result,errors,resolve-request}.ts`, `provider.ts`, `execute.ts`, then bind CLI or other clients through `src/app/<operation>.ts`.
- Reuse the **shared envelope** for agent usefulness: `result`, `metadata`, `references`, `warnings`; include stable references/locators for follow-up calls and citation.
- Reuse **progressive detail** (`concise|detailed|raw`) if landprice has bulky evidence/source fields. Be explicit that `raw` means diagnostic fields, not full unbounded upstream payloads.
- Reuse **typed failures**: `invalid_request`, `source_unavailable`, `source_changed`, `source_parse_failure`, `internal_error`, plus `retryable`, `parameter`, `sourceUrl`, `recoveryHint` where useful.
- Reuse **source adapter isolation**: keep upstream form/query fields, headers, parsers, and source models in `src/sources/<provider>/...`; expose only semantic public inputs.
- Reuse **docs layout**: minimal README; `VISION.md`; root `ARCHITECTURE.md`; `docs/research/<source-map>.md` for observed source behavior; `docs/specs/<capability>-v1.md` for stable contracts; `docs/specs/cli-transport-v1.md` if a subprocess CLI exists; `docs/learning/` only for secondary onboarding.
- Reuse **testing boundaries**: colocated deterministic tests for schemas, parsers, provider mapping, execution; `test/cli` for subprocess contract; `test/live` gated by env for real upstream checks.
- Reuse **naming conventions**: kebab-case operation names (`search-body`), PascalCase typed schemas/classes (`SearchBodyRequestSchema`), `createXOperation`, `defaultXOperation`, `executeX`, `XProvider`, `XProviderError`, `to<Source>ProviderResult`, `build<Form/Search>Form`.
- Avoid copying Darty-specific complexity too early: do not add `evals/`, agent tool wrappers, release binaries, or multiple transports until landprice has a stable core contract.
- Avoid README command duplication: Darty keeps README minimal and treats CLI help/specs as source of truth. Landprice should do the same if CLI options are still moving.
- Avoid leaking source quirks into public API. Darty documents observed-but-not-implemented DART UI fields in specs instead of exposing unstable knobs (`docs/specs/dsab007-search-v1.md` lines 39-94).
- If landprice will publish npm, copy the package discipline: Bun for dev, Node engine for consumers, `prepack` build, `prepublishOnly` typecheck+test, strict TS, and an explicit `bin` entry.
