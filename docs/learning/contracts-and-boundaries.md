# Contracts And Boundaries

`darty` is organized around contract boundaries. The current implementation has a public semantic contract, an internal DART replay contract, a provider seam between them, and transport adapters above them.

## Public Semantic Contract

The public `search-body` request uses names that make sense to callers:

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

This contract lives under `src/capabilities/search-body/contract/`. It is used for:

- runtime validation with Effect Schema
- TypeScript types
- JSON Schema export for transport adapters and tooling
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
search(request: SearchBodyRequest): Promise<SearchBodyProviderResult>
```

That provider result is already capability-shaped. This prevents raw DART source models from leaking upward into CLI, future adapters, or public result contracts.

The current provider is `dsab007ContentsProvider`, but the seam leaves room for another source implementation if the public capability remains the same.

## Transport Boundary

Transports own user/protocol experience:

- CLI owns flags, help text, examples, stdout formatting, and process behavior.
- Future adapters should own their own protocol metadata, request handling, output serialization, and protocol-specific error behavior.

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
| Provider seam | `SearchBodyProviderError` |
| Public capability | `SearchBodyFailure` |
| Transport | CLI process error or future adapter-specific error result |

External callers should reason about public capability failure codes, not source-internal classes.

## Design Tradeoffs

The current design allows a little duplication in transport metadata to keep boundaries clear. CLI help text and future adapter titles or annotations should not be forced through one manifest abstraction too early. The gain is explicit, transport-local UX; the cost is that small wording updates may touch more than one adapter when those adapters exist.

The other major tradeoff is keeping replay-only DART fields internal. This makes the public contract smaller and more stable, but it means low-level knobs such as page size are unavailable until live evidence shows they are worth exposing.
