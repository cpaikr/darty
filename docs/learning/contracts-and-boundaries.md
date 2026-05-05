# Contracts And Boundaries

`darty` is organized around contract boundaries. The current implementation has a public semantic contract, an internal DART replay contract, a provider seam between them, and transport adapters above them.

## Public Semantic Contract

The public `contents-search` request uses names that make sense to callers:

```text
page
sortBy: date | reportName
sortDirection: asc | desc
keyword
startDate: YYYYMMDD
endDate: YYYYMMDD
companyCode?
presenterName?
reportName?
```

This contract lives under `src/capabilities/contents-search/contract/`. It is used for:

- runtime validation with Effect Schema
- TypeScript types
- JSON Schema export for MCP and tooling
- defaulting optional behavior such as `page = 1`
- clear invalid-request errors

The resolver rejects unknown parameters before decoding. This matters for agents because misspelled fields fail loudly instead of being silently ignored.

## Public Result Contract

The successful result is a capability-owned envelope:

```text
{
  result: {
    request,
    pagination,
    items
  },
  metadata,
  references,
  warnings
}
```

The envelope is designed so downstream agents can verify and continue work:

- `request` echoes the normalized request.
- `pagination` tells the caller whether there are more pages.
- `items` preserve filing references and source evidence.
- `metadata` states the source surface and completeness.
- `warnings` make partial parsing explicit.

## Internal Replay Contract

DART's `dsab007` form has a different shape:

```text
option=contents
currentPage
maxResults
maxLinks
sort=DATE|rpt_nm
sortType=asc|desc
keyword
startDate
endDate
textCrpCik?
textCrpNm?
textPresenterNm?
reportName?
...duplicated b_* fields in the form body
```

This contract lives under `src/sources/dart/dsab007/contents/`. It exists because the adapter must reproduce DART's form behavior, but it is not the public caller interface.

The important boundary is:

```text
public request              internal replay request
-------------               -----------------------
companyCode       ------->  textCrpCik
presenterName     ------->  textPresenterNm
sortBy            ------->  DATE or rpt_nm
page              ------->  currentPage
```

`toDsab007ContentsReplayInput()` is the only function that should know both shapes.

## Provider Seam

The capability layer does not call DART directly. It calls a provider:

```ts
search(request: ContentsSearchRequest): Promise<ContentsSearchProviderResult>
```

That provider result is already capability-shaped. This prevents raw DART source models from leaking upward into CLI, MCP, or public result contracts.

The current provider is `dsab007ContentsProvider`, but the seam leaves room for another source implementation if the public capability remains the same.

## Transport Boundary

CLI and MCP own user/protocol experience:

- CLI owns flags, help text, examples, stdout formatting, and process behavior.
- MCP owns tool listing, schema advertisement, `tools/call`, structured output, and tool-result errors.

They do not own:

- required field checks
- enum/date validation
- request defaults
- DART replay fields
- HTML parsing
- public result shape

That split avoids a common failure mode where two transports drift into slightly different tools.

## Error Ownership

Error classes narrow as they move up:

| Layer | Error ownership |
|---|---|
| Source adapter | `SourceUnavailable`, `SourceChanged`, `ParseFailure`, `InvalidInput` |
| Provider seam | `ContentsSearchProviderError` |
| Public capability | `ContentsSearchFailure` |
| Transport | CLI process error or MCP `CallToolResult` error |

External callers should reason about public capability failure codes, not source-internal classes.

## Design Tradeoffs

The current design chooses a little duplication in transport metadata to keep boundaries clear. CLI help text and MCP titles are not forced through one manifest abstraction. The gain is explicit, transport-local UX; the cost is that small wording updates may touch more than one adapter.

The other major tradeoff is keeping replay-only DART fields internal. This makes the public contract smaller and more stable, but it means low-level knobs such as page size are unavailable until live evidence shows they are worth exposing.
