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

- `documentId`: a returned `documents[].id`; defaults to the selected body document
- `sectionId`: a returned `toc[].id`; used only to fetch one TOC section. Section IDs are assigned per report, so callers must not reuse them across years, amendments, or receipt numbers.
- `outputFormat`: `html` or `markdown`, default `markdown`
- `maxBytes`: maximum returned content-window bytes, default `50000`. Raising this value can substantially increase CLI output and agent context use for long sections.
- `contentStartByte`: UTF-8 byte offset into the rendered `content.body` format, default `0`. This is not DART's raw viewer `offset`; use `content.window.nextStartByte` to continue reading.

## Response Behavior

- TOC-backed documents return `documents` and `toc` without content unless a
  `sectionId` is supplied.
- Section calls return `content.format` plus the rendered string in `content.body`,
  along with parent/previous/next/children navigation when available. Long
  sections can produce large outputs; callers should fetch the TOC first, request
  only needed sections, and keep `maxBytes` as low as practical.
- Returned content includes `content.window` with `unit: "utf8-bytes"`,
  `startByte`, exclusive `endByte`, `hasMore`, and optional `nextStartByte`.
  The window is over the rendered output (`markdown` or sanitized `html`), not
  the DART viewer source. If a caller gives a byte offset inside a multibyte
  character, the implementation advances to the next valid UTF-8 boundary and
  reports the actual `window.startByte`.
- `markdown` output is best-effort. Common headings, paragraphs, emphasis,
  links, code blocks, and lists are converted; complex or unknown structures may
  be simplified. Tables are preserved as sanitized HTML inside the Markdown so
  merged cells and other DART table shapes are not flattened into misleading
  pipe tables.
- Documents with no DART TOC return the selected document content by default when
  `sectionId` is omitted and add a `no_toc_returned_document` warning.
- Windowed `content.body` responses add a `content_truncated` warning only when `content.window.hasMore` is true. Final continuation windows can still have `truncated: true` because they are not the full rendered content, but they do not warn.
- `metadata.source.endpoints.shell` records the viewer shell endpoint. When
  content is returned, `metadata.source.endpoints.content` records the iframe
  content endpoint without exposing raw DART viewer params.

## Source Basis

Implemented against observed DART viewer behavior in
[`docs/research/dart-source-map.md`](../research/dart-source-map.md):

- entry shell: `/dsaf001/main.do?rcpNo={receiptNumber}`
- body iframe: `/report/viewer.do?rcpNo=...&dcmNo=...&eleId=...&offset=...&length=...&dtd=...`
- TOC data: shell-embedded `treeData`
