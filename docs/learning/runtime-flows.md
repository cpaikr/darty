# Runtime Flows

The main runtime flow is a capability request that enters through either CLI flags or the trusted-host toolset, converges in the shared app/capability layers, and then calls a DART source adapter.

## One Core, Current Public Transports

```text
CLI argv                @sjunepark/darty/toolset
   |                             |
   v                             v
src/cli/commands/...        src/toolset.ts
   |                             |
   +-------------+---------------+
                 |
                 v
src/app/<capability>.ts
   |
   v
src/capabilities/<capability>/execute.ts
   |
   v
src/sources/dart/...
   |
   v
DART web endpoint
```

The important point: transports parse or validate host input, then delegate. They do not implement DART search or view-report behavior themselves. The `src/app/` seam remains shared composition behind the public CLI and toolset surfaces.

## CLI Flow

1. `src/cli.ts` creates the root Commander program.
2. `src/cli/commands/*` registers commands and flags.
3. The command extracts only provided flags into a partial input object.
4. The CLI command runner calls the injected operation runner.
5. On success, the CLI writes one JSON result envelope to stdout. `--pretty` only changes indentation.

The CLI performs only shallow parsing where Commander needs it, such as converting `--page` to a number. Semantic validation still happens in the shared capability executor.

## Shared Capability Flow

```text
raw input object
      |
      v
resolve request
      |
      v
normalized capability request
      |
      v
provider method
      |
      v
provider result
      |
      v
public result envelope
```

The capability layer does three key jobs:

- rejects unknown or invalid public inputs
- applies defaults where the contract defines them
- converts provider-specific failures into capability-owned failures

This is why CLI commands can stay thin without duplicating domain validation.

## DART Contents Search Adapter Flow

```text
SearchBodyRequest
      |
      v
toDsab007ContentsReplayInput()
      |
      v
buildContentsSearchForm()
      |
      v
fetchContentsSearchHtml()
      |
      v
parseContentsSearchHtml()
      |
      v
toDsab007ContentsProviderResult()
```

The adapter is where semantic inputs become DART replay fields:

- `page` -> `currentPage`
- `sortBy: date` -> `sort: DATE`
- `sortBy: reportName` -> `sort: rpt_nm`
- `sortDirection` -> `sortType`
- `companyCode` -> `textCrpCik`
- `presenterName` -> `textPresenterNm`
- `reportName` -> `reportName`

Replay-only values such as fixed page size, pager width, and duplicated `b_*` fields stay inside the adapter.

## Result Flow

A source row becomes a public item:

```text
SourceContentsRow
      |
      v
SearchBodyItem
  company      <- company name, market label, corp code
  filing       <- receipt number, document number, report title, date
  match        <- snippet and labels
  references   <- viewer URL
  evidence     <- raw report/info/snippet evidence
```

The result envelope then attaches pagination, metadata, source URL references, and warnings. If row parsing partially fails but the page is still usable, dropped rows become warnings and `metadata.completeness` becomes `partial`.

## Error Flow

Errors intentionally change ownership as they move upward:

```text
source error
   -> provider error
      -> capability failure
         -> CLI process error
```

This keeps external callers from depending on DART-specific error classes while preserving useful categories such as `source_unavailable`, `source_changed`, and `source_parse_failure`.

At the CLI boundary, normal command failures are still JSON: stdout contains one failure envelope with `result: null`, a typed `error`, and `metadata.cliTransportVersion: "1"`; stderr stays empty. Help output is the deliberate human-readable exception.
