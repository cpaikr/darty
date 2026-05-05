# Codebase Map

This page maps the repo by responsibility rather than by every file. Use it to decide where to read next.

## Top-Level Shape

```text
.
├── README.md                  public CLI orientation
├── VISION.md                  product goals, scope, and non-goals
├── ARCHITECTURE.md            repo-level ownership and flow map
├── docs/
│   ├── learning/              onboarding explanations, not source of truth
│   ├── research/              observed DART source evidence
│   ├── specs/                 evidence-backed capability specs
│   └── tools/                 general tool-design guidance
├── evals/                     model/tool-use scenario evals
├── src/                       implementation slice
└── test/                      live and broader integration checks
```

The docs are deliberately split by authority:

- Product intent lives at the root in `VISION.md`.
- Source evidence lives under `docs/research/`.
- Stable capability contracts live under `docs/specs/`.
- Learning material lives here and should point to those sources rather than replace them.

## Implementation Areas

```text
src/
├── app/                       shared operation composition
├── capabilities/              public contracts and transport-neutral execution
├── cli.ts                     CLI entry point
├── cli/commands/              Commander command adapter
└── sources/dart/              DART-specific source adapters and errors
```

### `src/app/`

`src/app/contents-search.ts` is the composition seam. It wires:

- operation name
- input/result JSON Schemas
- shared executor
- default DART provider

Transports import this seam so they do not need to know which source adapter backs the operation.

### `src/capabilities/`

The capability layer owns public behavior:

- request schema and defaults
- result schema
- JSON Schema export
- typed failures
- request resolution and semantic validation
- provider interface
- shared execution flow

This is the layer to read when asking, "What is the public contract of `contents-search`?"

### `src/sources/dart/`

The source layer owns DART-specific details:

- raw replay schema for `dsab007` contents search
- form encoding for `/dsab007/search.ax`
- HTTP fetch behavior
- HTML parsing with `cheerio`
- source-model validation
- mapping source failures into provider errors

This is intentionally below the public contract. DART field names like `textCrpCik`, `sortType`, and duplicated `b_*` form fields should not leak into CLI or future adapters unless the product contract changes.

### `src/cli*`

The CLI adapter owns user-facing command behavior:

- Commander command and flags
- help text and examples
- shallow integer parsing for CLI ergonomics
- stdout JSON rendering

It does not own required-field validation, enum validation, date-format validation, defaults, or result shaping. Those belong to the capability layer.

### Future adapters

The early MCP adapter was removed from the active tree and preserved at git tag `archive/mcp-before-removal`. Future MCP, Pi-native, SDK, or other adapters should reuse `src/app/` and `src/capabilities/` rather than importing DART source internals directly.

## Test And Eval Areas

- Colocated `*.test.ts` files prove module-level contracts and boundaries.
- `test/cli/` runs subprocess CLI smoke checks.
- `test/live/` contains opt-in live checks against DART.
- `evals/contents-search/` checks fixed CLI scenarios and model/tool-use behavior.

See [Verification map](verification-map.md) for the testing boundary in learning order.

## Where To Start For Common Questions

| Question | Start here |
|---|---|
| How do I run the tool? | [README](../../README.md) |
| What is the product trying to become? | [VISION](../../VISION.md) |
| How does the current source architecture work? | [src/ARCHITECTURE](../../src/ARCHITECTURE.md) |
| What does `contents-search` accept and return? | `src/capabilities/contents-search/contract/` |
| How does public input become a DART POST body? | `src/sources/dart/dsab007/contents/search.ts` then `build-form.ts` |
| How are rows parsed from DART HTML? | `src/sources/dart/dsab007/contents/parse-html.ts` |
| How are agentic evals organized? | [evals README](../../evals/README.md) |
