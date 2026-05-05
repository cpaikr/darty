# Runtime Flows

The main runtime flow is a `contents-search` request. It can enter through CLI flags or MCP tool arguments, but both paths converge before semantic validation and source access.

## One Core, Two Transports

```text
CLI argv                         MCP tools/call
   |                                  |
   v                                  v
src/cli/commands/...           src/mcp/server.ts
   |                                  |
   +---------------+------------------+
                   |
                   v
        src/app/contents-search.ts
                   |
                   v
  src/capabilities/contents-search/execute.ts
                   |
                   v
  src/sources/dart/dsab007/contents/search.ts
                   |
                   v
        POST /dsab007/search.ax
```

The important point: CLI and MCP parse transport input, then delegate. They do not each implement DART search behavior.

## CLI Flow

1. `src/cli.ts` creates the root Commander program.
2. `createContentsSearchCommandWithRunner()` registers the `contents-search` command and flags.
3. The command extracts only provided flags into a partial input object.
4. `executeContentsSearchCommand()` calls the injected operation runner.
5. On success, the CLI writes one pretty-printed JSON result to stdout.

The CLI performs only shallow parsing where Commander needs it, such as converting `--page` to a number. Semantic validation still happens in the shared capability executor.

## MCP Flow

1. `src/mcp.ts` starts the stdio server.
2. `createDartyMcpServer()` registers one tool definition for `contents-search`.
3. The tool definition advertises JSON Schemas from the shared operation.
4. `tools/call` forwards the JSON arguments to the shared operation.
5. On success, MCP returns both `structuredContent` and matching text JSON.
6. Known `ContentsSearchFailure` errors become `CallToolResult` errors instead of thrown transport crashes.

The MCP adapter owns protocol details, not the domain contract.

## Shared Capability Flow

```text
raw input object
      |
      v
resolveContentsSearchRequest()
      |
      v
normalized ContentsSearchRequest
      |
      v
provider.search(request)
      |
      v
ContentsSearchProviderResult
      |
      v
buildContentsSearchResult()
      |
      v
public result envelope
```

The capability layer does three key jobs:

- rejects unknown or invalid public inputs
- applies defaults for `page`, `sortBy`, and `sortDirection`
- converts provider-specific failures into capability-owned failures

This is why both CLI and MCP get aligned behavior without duplicating validation.

## DART Adapter Flow

```text
ContentsSearchRequest
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
ContentsSearchItem
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
   -> ContentsSearchProviderError
      -> ContentsSearchFailure
         -> CLI thrown error or MCP tool error result
```

This keeps external callers from depending on DART-specific error classes while preserving useful categories such as `source_unavailable`, `source_changed`, and `source_parse_failure`.
