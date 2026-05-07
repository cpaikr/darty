# Source Architecture

This document covers the current implementation under `src/`. It sits below the
repo-root [ARCHITECTURE.md](../ARCHITECTURE.md), which explains the broader repo
shape and document ownership.

## Purpose

`src/` contains the executable slice of `darty`: public `search-body`,
`search-company`, `company-detail`, `company-rss`, and `view-report`
capabilities, a local CLI transport, and internal DART source adapters for
`dsab007` search, `dsae001` company overview search/detail, DART company RSS,
and `dsaf001` report viewing.

The design goal is to keep the core reusable across transports. The active
transport is CLI, but future MCP, Pi-native, SDK, or other adapters should bind
to the same capability contracts and app composition layer instead of copying
DART-specific logic.

## Archived MCP Adapter

The early MCP adapter was removed from the active `src/` tree while the project
is greenfield. The exact implementation is preserved at git tag
`archive/mcp-before-removal`. Treat MCP as a future adapter option, not a
current supported transport.

## Layer Overview

The CLI is not the real app. The capability layer is: a semantic request
contract, a provider interface, and an execution path that normalizes errors
and shapes results. CLI is the current transport host over that core.

```mermaid
graph TD
    subgraph Transport["Transport Adapters"]
        CLI["CLI · src/cli/"]
        FUTURE["Future adapters\nMCP · Pi-native · SDK"]
    end

    subgraph App["Shared Composition · src/app/"]
        APP["Operation name · schemas · provider wiring"]
    end

    subgraph Cap["Capability Contracts · src/capabilities/"]
        CAP["Request/result schemas · validation · execution"]
    end

    subgraph Src["Source Adapters · src/sources/dart/"]
        SRC["Replay/viewer contracts · request builders · HTML parsers"]
    end

    CLI --> APP
    FUTURE -.-> APP
    APP --> CAP
    CAP --> SRC
    SRC --> DART[("dart.fss.or.kr")]
```

| Layer | Path | Owns |
|-------|------|------|
| **Transport** | `src/cli.ts`, `src/cli/` | Parse transport input, own transport UX, call the shared operation, and serialize results |
| **Composition** | `src/app/` | Share default provider wiring plus machine-readable schema access across transports |
| **Capability** | `src/capabilities/` | Public semantic request/result schemas, JSON Schema export, validation, and execution |
| **Source** | `src/sources/dart/` | DART replay/viewer fields, form POST or viewer GETs, HTML parsing, source models, and error mapping |

## Component Map

The diagram shows the established `search-body` path. `search-company`,
`company-detail`, `company-rss`, and `view-report` use the same
transport/app/capability shape through their matching `app/`, `capabilities/`,
`cli/commands/`, and `sources/dart/` modules.

```mermaid
graph TD
    CLI_TS["src/cli.ts"] --> CMD["src/cli/commands/search-body.ts"]
    CMD --> RUN["executeSearchBodyCommand()"]
    CLI_TS --> APP["src/app/search-body.ts"]
    APP --> SPEC["spec.ts\noperation name\n+ JSON Schema"]
    APP --> EXEC["execute.ts\nvia shared operation"]
    RUN --> EXEC
    EXEC --> PROV["provider.ts"]
    PROV --> SEARCH["search.ts"]
    SEARCH --> FETCH["fetch.ts"]
    FETCH --> FORM["build-form.ts"]
    FETCH --> PARSE["parse-html.ts"]

    CONTRACT["contract.ts + contract/\npublic schema + resolver"] --> EXEC
    CONTRACT --> SPEC

    REPLAY["replay-schema.ts"] --> SEARCH
    MODEL["source-model.ts"] --> PARSE

    FETCH -->|POST| DART[("/dsab007/search.ax")]

    subgraph cli ["src/cli/"]
        CLI_TS
        CMD
    end
    subgraph app ["src/app/"]
        APP
    end
    subgraph cap ["src/capabilities/search-body/"]
        CONTRACT
        SPEC
        EXEC
        PROV
        RUN
    end
    subgraph source ["src/sources/dart/dsab007/contents/"]
        SEARCH
        FETCH
        FORM
        PARSE
        REPLAY
        MODEL
    end
```

- **`src/cli.ts`** — Root Commander program. Registers commands and turns
  failures into a process exit code.
- **`src/cli/commands/`** — CLI transport adapters. Own Commander flags, help
  text, examples, and stdout formatting while delegating semantic validation and
  execution through an injected command runner.
- **`src/app/`** — Shared operation wiring. Exposes operation names, JSON
  Schemas, and capability executors with the default DART providers already
  attached.
- **`src/capabilities/`** — Public, transport-neutral contracts and execution
  flow. Defines semantic inputs, success result shapes, typed failures, and
  execution logic.
- **`src/sources/dart/`** — Internal DART adapters. Owns replay/viewer schemas,
  request construction, HTML parsing/sanitization, source models, and error mapping.
  `dsab007/contents` powers body-content search; `dsae001/company` powers
  company-name search; `dsae001/detail` powers company detail lookup;
  `api/company-rss` powers company RSS; `dsaf001/report` resolves receipt
  viewer shells, document selectors, TOCs, content planning, navigation,
  sanitized HTML, and best-effort Markdown.

## Behavior-First Core

The biggest design choice is **behavior-first core, transport-local UX**. The
shared layer owns semantic schemas and execution behavior. Each transport owns
its own presentation and protocol details.

```mermaid
graph LR
    CONTRACT["contract.ts + contract/\nEffect Schema"] --> VALIDATE["Runtime\nvalidation"]
    CONTRACT --> TS["TypeScript\ntypes"]
    CONTRACT --> SPEC["spec.ts\noperation name\n+ JSON Schema"]

    SPEC --> CLI_META["CLI name reuse"]
    SPEC -.-> FUTURE_META["Future adapter schemas"]
    CONTRACT --> RESULT["Success result\nenvelope"]

    CLI_META -. transport local .-> CLI_FLAGS["CLI flags · help · examples"]
    FUTURE_META -. adapter local .-> FUTURE_UX["MCP · Pi-native · SDK metadata"]
```

How it works:

1. **`contract.ts`** re-exports the public contract modules. The backing
   `contract/` files define the request schema, success result schema, typed
   failures, and semantic validation rules.
2. **`spec.ts`** exports the operation name plus request/result JSON Schemas for
   transports and tooling.
3. **`app/`** wires those schemas and shared executors to the default provider
   implementations.
4. **`cli/commands/`** defines each CLI UX explicitly, then delegates to the
   shared operation.
5. Future adapters should use the same operation name, schemas, and app wiring
   while keeping protocol-specific metadata local to that adapter.

One source of truth gives you:

- runtime validation shape
- TypeScript types
- success result schema
- JSON Schema for transport adapters

What is intentionally *not* centralized:

- CLI flags, help text, and examples
- protocol-specific titles, annotations, prompts, or rendering

## Runtime Flow

The detailed diagram below shows the `search-body` path. `view-report`
follows the same transport/app/capability/provider layering, but its source
adapter uses GET requests against `/dsaf001/main.do` and `/report/viewer.do`
instead of the `dsab007` POST replay flow. Inside `dsaf001/report`, `view.ts`
keeps the top-level provider orchestration while `source.ts`, `plan.ts`,
`content.ts`, and `navigation.ts` own fetch seams, content selection, HTML
truncation, and TOC navigation respectively.

```mermaid
graph TD
    CLI_INPUT["CLI flags"]
    FUTURE_INPUT["Future adapter input"]
    CLI_CMD["executeSearchBodyCommand()\nCLI-only stdout handling"]
    APP["src/app/search-body.ts\nshared operation"]
    RESOLVE["resolveSearchBodyRequest()"]
    REQUEST["Validated\nSearchBodyRequest"]
    PROVIDER["provider.search()"]
    TO_REPLAY["toDsab007ContentsReplayInput()"]
    BUILD["buildContentsSearchForm()"]
    FETCH["fetchContentsSearchHtml()"]
    POST["POST /dsab007/search.ax"]
    HTML["HTML response"]
    PARSE_HTML["parseContentsSearchHtml()"]
    SOURCE_PAGE["SourceContentsSearchPage"]
    TO_RESULT["toDsab007ContentsProviderResult()"]
    ENVELOPE["SearchBodyResult\nenvelope"]
    CLI_OUTPUT["JSON to stdout"]
    FUTURE_OUTPUT["Future adapter output"]

    CLI_INPUT --> CLI_CMD
    CLI_CMD --> APP
    FUTURE_INPUT -.-> APP
    APP --> RESOLVE
    RESOLVE --> REQUEST
    REQUEST --> PROVIDER
    PROVIDER --> TO_REPLAY
    TO_REPLAY --> BUILD
    BUILD --> FETCH
    FETCH --> POST
    POST --> HTML
    HTML --> PARSE_HTML
    PARSE_HTML --> SOURCE_PAGE
    SOURCE_PAGE --> TO_RESULT
    TO_RESULT --> ENVELOPE
    ENVELOPE --> CLI_OUTPUT
    ENVELOPE -.-> FUTURE_OUTPUT
```

Step by step:

1. CLI converts flags into a partial object keyed by public semantic names (`keyword`, `startDate`, etc.) and calls `executeSearchBodyCommand()`.
2. Future adapters should convert their protocol input into the same public semantic object and call the shared operation from `src/app/search-body.ts`.
3. `resolveSearchBodyRequest()` rejects unknown parameters, then uses the public request schema to apply defaults and validate required fields, enums, integer bounds, and date formats.
4. `src/app/search-body.ts` wires the shared capability executor to the default `dsab007ContentsProvider`.
5. `toDsab007ContentsReplayInput()` translates the public request into the internal replay contract (`DATE`/`rpt_nm`, `textCrpCik`, `maxResults`).
6. `buildContentsSearchForm()` encodes the replay input as `URLSearchParams`.
7. `fetchContentsSearchHtml()` POSTs the form body to `/dsab007/search.ax`.
8. `parseContentsSearchHtml()` extracts rows, pagination, and warnings from the HTML fragment.
9. `toDsab007ContentsProviderResult()` maps source rows into public items.
10. `buildSearchBodyResult()` wraps the provider result in a capability-owned envelope with metadata, references, and warnings.
11. The CLI serializes the envelope as exactly one JSON stdout payload.

Semantic validation happens inside the capability executor, not in the CLI transport. This keeps future adapters aligned without reimplementing validation.

## Two Schemas

There are two schemas in play, deliberately kept separate.

```mermaid
graph LR
    subgraph Public["Public Schema · contract.ts"]
        direction TB
        P_KW["keyword"]
        P_DATE["startDate · endDate"]
        P_SORT["sortBy: date | reportName"]
        P_COMPANY["companyCode"]
        P_PAGE["page"]
    end

    subgraph Internal["Replay Schema · replay-schema.ts"]
        direction TB
        I_KW["keyword"]
        I_DATE["startDate · endDate"]
        I_SORT["sort: DATE | rpt_nm"]
        I_COMPANY["textCrpCik"]
        I_PAGE["currentPage"]
        I_FIXED["maxResults · maxLinks\noption · b_* fields"]
    end

    P_KW ---|1:1| I_KW
    P_DATE ---|1:1| I_DATE
    P_SORT ---|renamed| I_SORT
    P_COMPANY ---|renamed| I_COMPANY
    P_PAGE ---|renamed| I_PAGE
```

- **Public semantic schema** (`SearchBodyRequestSchema`, re-exported from
  `contract.ts`): what users and future adapters see. Semantic names, clean
  enums, documented metadata.
- **Internal replay schema** (`SourceContentsReplayInput` in
  `replay-schema.ts`): what DART's form actually expects. Raw field names,
  fixed page-size values, duplicated `b_*` parameters.

`toDsab007ContentsReplayInput()` is the only function that knows both. The
replay schema stays internal unless the product decides to expose lower-level
knobs.

## Transport Extension Seam

Future transports should reuse the same layer split instead of reimplementing
tool contracts.

```mermaid
graph TD
    subgraph CLI["CLI Transport"]
        CLI_CMD["Commander\nargv parsing"]
    end

    subgraph Future["Future Transport"]
        ADAPTER["Protocol handler\nsemantic JSON input"]
    end

    OP_ID["searchBodyOperationName"]
    INPUT_SCHEMA["searchBodyInputJsonSchema"]
    RESULT_SCHEMA["searchBodyResultJsonSchema"]
    COMPOSE["src/app/search-body.ts\nshared provider wiring"]
    EXEC["executeSearchBody()"]

    OP_ID --> CLI_CMD
    OP_ID -.-> ADAPTER
    INPUT_SCHEMA -.-> ADAPTER
    RESULT_SCHEMA -.-> ADAPTER
    CLI_CMD --> COMPOSE
    ADAPTER -.-> COMPOSE
    COMPOSE --> EXEC
```

A future adapter should reuse:

- operation identifiers such as `searchBodyOperationName`
- input JSON Schemas such as `searchBodyInputJsonSchema`
- result JSON Schemas such as `searchBodyResultJsonSchema`
- `src/app/*` shared provider wiring plus raw semantic execution
- capability executors such as `executeSearchBody()` for validation and error normalization

This keeps adapters aligned on the same public contract and executor while each
host keeps explicit control over adapter wiring.

## Start Here

- `src/cli.ts` — top-level transport entry point
- `src/app/*` — shared transport composition seams
- `src/cli/commands/*` — explicit CLI surfaces over shared operations
- `src/cli/command-helpers.ts` — small Commander transport helpers shared by
  command files
- `src/capabilities/*/contract.ts` — public input/output contracts, typed
  failures, and request resolution
- `src/capabilities/*/spec.ts` — operation identifiers and machine-readable
  request/result schemas
- `src/capabilities/*/execute.ts` — shared validation, execution, and error
  normalization
- `src/sources/dart/dsab007/contents/search.ts` and
  `src/sources/dart/dsae001/company/search.ts` — public-to-source mapping and
  provider boundaries

## Test Coverage Map

Tests make the design relationships explicit:

- `spec.test.ts` — request/result JSON Schemas come from the same core schemas
- `search-body.test.ts` — CLI surface is explicit while still delegating to
  the shared executor
- `contract.test.ts` — semantic resolution is shared and transport-independent
- `execute.test.ts` — provider errors get normalized into capability-owned failures
- `test/cli/` — subprocess CLI reflects the shared core

## Invariants

- Public capability modules do not import DART-specific replay schemas or parser
  models. That boundary keeps future transports independent from source details.
- CLI parsing stays shallow. Required fields, defaults, enum checks, and public
  validation happen in capability execution, not in Commander option handlers.
- Provider implementations return capability-shaped results, not raw source page
  structures.
- The replay contract is intentionally richer than the public contract. Fields
  that exist only to satisfy DART form behavior stay internal until the project
  decides they are stable public knobs.
- The capability layer is the single source of truth for semantic behavior and
  machine-readable request/result schemas.
- Adapters may duplicate small amounts of transport UX metadata rather than
  forcing one shared manifest abstraction.
