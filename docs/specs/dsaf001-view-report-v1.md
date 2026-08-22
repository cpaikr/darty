# dsaf001 Report View v1

Status: implemented initial contract.

## Purpose

`view-report` resolves a DART receipt into the viewer document context and uses
progressive disclosure for report content:

1. call with a receipt number or viewer URL to get documents and TOC
2. call again with a returned `sectionId` to get best-effort Markdown or sanitized HTML for one section

The tool is read-only and hides DART's raw viewer parameters (`dcmNo`, `eleId`,
`offset`, `length`, `dtd`) behind stable tool IDs.

## Request

Required:

- `receipt`: bare DART receipt number or `/dsaf001/main.do?rcpNo=...` URL. If the URL also includes `dcmNo`, the tool uses it internally to select that document.

Optional:

- `documentId`: a returned `documents[].id`; defaults to the document selected by
  a receipt URL containing `dcmNo`, otherwise to the selected body document.
  A top-level raw `dcmNo` input remains invalid; embedding it in a returned DART
  viewer URL is the only supported exception.
- `sectionId`: a returned `toc[].id`; used only to fetch one TOC section. Section
  IDs are scoped to the same receipt and selected document, so callers must not
  reuse them across documents, years, amendments, or receipt numbers.
- `outputFormat`: `html` or `markdown`, default `markdown`
- `maxBytes`: maximum returned content-window bytes, default `50000`, range `1000` to `1000000`. Raising this value can substantially increase CLI output and agent context use for long sections.
- `contentStartByte`: UTF-8 byte offset into the rendered `content.body` format, default `0`. This is not DART's raw viewer `offset`; use `content.window.nextStartByte` with the same `receipt`, `documentId`, `sectionId`, and `outputFormat` to continue reading.
- `detail`: `concise`, `detailed`, or `raw`, default `concise`. Section-content calls omit repeated `documents` and `toc` locator payloads in `concise`; use `detailed` or `raw` when those locators are needed alongside content.

## Response Behavior

- TOC-backed documents return `documents` and `toc` without content unless a
  `sectionId` is supplied.
- Section calls return `content.format` plus the rendered string in `content.body`,
  along with parent/previous/next/children navigation when available. In default `concise` responses, `documents` and `toc` are omitted from section calls because the caller already needed a returned `sectionId`; `detailed` and `raw` keep them. Long
  sections can produce large outputs; callers should fetch the TOC first, request
  only needed sections, and keep `maxBytes` as low as practical.
- Returned content includes `content.isFullContent` and `content.window` with
  `unit: "utf8-bytes"`, `startByte`, exclusive `endByte`, `hasMore`, and
  optional `nextStartByte`. `isFullContent` tells whether `content.body` is the
  whole rendered body. `window.hasMore` tells whether another continuation call
  is available. The window is over the rendered output (`markdown` or sanitized
  `html`), not the DART viewer source. If a caller gives a byte offset inside a
  multibyte character, the implementation advances to the next valid UTF-8
  boundary and reports the actual `window.startByte`.
- A nonnegative `contentStartByte` at or beyond the rendered body size succeeds
  with an empty body, `startByte` and `endByte` equal to the body size, and
  `hasMore: false`.
- `markdown` output is best-effort. Common headings, paragraphs, emphasis,
  links, code blocks, and lists are converted; complex or unknown structures may
  be simplified. Tables are preserved as sanitized HTML inside the Markdown so
  merged cells and other DART table shapes are not flattened into misleading
  pipe tables.
- Documents with no DART TOC return the selected document content by default when
  `sectionId` is omitted and add a `no_toc_returned_document` warning.
- Windowed `content.body` responses add a `content_truncated` warning only when `content.window.hasMore` is true. Final continuation windows have `content.isFullContent: false` and `content.window.hasMore: false`, so callers know the response is partial but complete for the requested continuation.
- `metadata.source.endpoints.shell` records the viewer shell endpoint. When
  content is returned, `metadata.source.endpoints.content` records the iframe
  content endpoint without exposing raw DART viewer params.

## Failures

| Code | Retryable | Meaning |
|---|---:|---|
| `invalid_request` | no | request is missing, malformed, has an unsupported option, uses raw DART viewer parameters, or has an invalid content window |
| `not_found` | no | the requested `documentId` or `sectionId` is not present in the resolved report context |
| `source_unavailable` | yes | DART viewer endpoint could not be fetched |
| `source_changed` | no | viewer HTML no longer matches required parser assumptions |
| `source_parse_failure` | no | response HTML or decoded source model could not be parsed |
| `internal_error` | no | unexpected provider or implementation failure |

Typed failures may include optional `recoveryHint` with a concise next action. For stale `documentId` or `sectionId`, it should tell callers to rerun `view-report` for the same receipt and use returned IDs. For continuation windows, it should point to `content.window.nextStartByte` instead of raw DART `offset` or `length` values.

Returned document and section IDs are opaque echo-only locators. The current
implementation renders positional values such as `document:body:1`,
`document:attachment:1`, and `section:1.2`; callers must not synthesize them.

The semantic contract accepts DART viewer URLs. The TypeScript baseline also
accepts any absolute URL containing a 14-digit `rcpNo`; this is a preserved
compatibility quirk, not permission for rewrite implementations to broaden the
documented URL contract further.

## Source Basis

Implemented against observed DART viewer behavior in
[`docs/research/dart-source-map.md`](../research/dart-source-map.md):

- entry shell: `/dsaf001/main.do?rcpNo={receiptNumber}`
- body iframe: `/report/viewer.do?rcpNo=...&dcmNo=...&eleId=...&offset=...&length=...&dtd=...`
- TOC data: shell-embedded `treeData`
