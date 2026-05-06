# DART Source Adapter

The current DART adapter replays the `dsab007` integrated filing search for body-content search. It is the part of the codebase that understands DART's form fields, HTML fragment, and source-specific failure modes.

## Where It Lives

```text
src/sources/dart/dsab007/contents/
├── replay-schema.ts          internal replay input schema
├── build-form.ts             URLSearchParams form body builder
├── fetch.ts                  HTTP POST and parser orchestration
├── parse-html.ts             Cheerio parser for the returned HTML fragment
├── source-model.ts           source-page and row schemas
├── search.ts                 provider mapping and error mapping
└── replay-contract/          field contract probes and live classifications
```

## Adapter Responsibilities

The adapter owns four jobs:

1. Translate a public `SearchBodyRequest` into `SourceContentsReplayInput`.
2. Serialize that replay input into the form body DART expects.
3. Fetch and parse DART's HTML response.
4. Map source rows and source failures back to the provider seam.

It should not define public CLI flags, future adapter schemas, or product-level capability names.

## Replay Input

`replay-schema.ts` defines the internal request shape accepted by the adapter. It includes DART-shaped names and fields that are not part of the public contract.

The adapter currently fixes the mode to `option=contents` and uses observed values for page size and pager width:

```text
effectivePageSize = 10
effectivePagerWidth = 10
callerControlsPageSize = false
callerControlsPagerWidth = false
```

Those fields are still sent because DART's form expects them, but public callers do not control them.

## Form Encoding

`build-form.ts` turns the replay input into `URLSearchParams`. Some values are duplicated into `b_*` fields because the observed DART form uses both current and backing fields.

That duplication is intentionally hidden below the replay contract. A public caller should not need to know why both `keyword` and `b_keyword` are sent.

## Fetching

`fetch.ts` posts the encoded form to:

```text
https://dart.fss.or.kr/dsab007/search.ax
```

The response is an HTML fragment, not JSON. Fetching uses Effect's HTTP client layer and maps network/source failures into source-level errors before the provider maps them again.

## Parsing

`parse-html.ts` uses `cheerio` to extract:

- total count and page info
- table rows
- company name, market label, and `corpCik`
- report title parts and filing identifiers such as `rcpNo` and `dcmNo`
- snippet HTML and collapsed snippet text
- disclosure/content labels and presenter name
- receipt date
- viewer URL

Parsing treats no-result pages as a successful empty result when DART renders the observed Korean placeholder text.

If a row cannot be parsed but the rest of the page is usable, the parser drops that row and records a warning. The provider later exposes this as `partial_rows_dropped` and marks metadata completeness as `partial`.

## Source Model vs Public Item

The source model preserves raw DART details that help parsing and evidence:

```text
SourceContentsRow
  companyName
  corpCik
  reportNameRaw
  rcpNo
  dcmNo
  snippetHtml
  rawInfoText
  viewerPath
  viewerUrl
  receiptDate
```

`search.ts` maps that into the public item shape:

```text
SearchBodyItem
  company
  filing
  match
  references
  evidence
```

This keeps public results useful while avoiding direct dependence on parser internals.

## Replay Contract Probes

`replay-contract/` documents and tests the low-level field behavior the adapter relies on. It distinguishes fields that are accepted and honored from fields that appear accepted but ignored upstream.

This is important because DART can accept a form field without letting callers meaningfully control behavior. The public contract should only promote fields when source evidence supports doing so.

## Fragile Edges To Notice

- DART returns HTML, so CSS selectors and text patterns are part of the source contract.
- No-result pages may omit normal pagination markup.
- Attachment/report-name rows can have report title modifiers, periods, and suffixes that should not be flattened too aggressively.
- `textCrpNm` exists in replay investigation but is not currently a public input because observed behavior does not justify exposing it.
- `maxResults` and `maxLinks` are sent but currently treated as upstream-controlled behavior.

For source evidence, use [docs/research/dart-source-map.md](../research/dart-source-map.md) rather than this learning page.
