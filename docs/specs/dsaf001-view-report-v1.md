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
- `sectionId`: a returned `toc[].id`; used only to fetch one TOC section
- `outputFormat`: `html` or `markdown`, default `markdown`
- `maxBytes`: maximum returned content bytes, default `200000`

## Response Behavior

- TOC-backed documents return `documents` and `toc` without content unless a
  `sectionId` is supplied.
- Section calls return `content.format` plus the rendered string in `content.body`,
  along with parent/previous/next/children navigation when available.
- `markdown` output is best-effort. Common headings, paragraphs, emphasis,
  links, code blocks, and lists are converted; complex or unknown structures may
  be simplified. Tables are preserved as sanitized HTML inside the Markdown so
  merged cells and other DART table shapes are not flattened into misleading
  pipe tables.
- Documents with no DART TOC return the selected document content by default when
  `sectionId` is omitted and add a `no_toc_returned_document` warning.
- Oversized `content.body` is truncated and adds a `content_truncated` warning.
- `metadata.source.endpoints.shell` records the viewer shell endpoint. When
  content is returned, `metadata.source.endpoints.content` records the iframe
  content endpoint without exposing raw DART viewer params.

## Source Basis

Implemented against observed DART viewer behavior in
[`docs/research/dart-source-map.md`](../research/dart-source-map.md):

- entry shell: `/dsaf001/main.do?rcpNo={receiptNumber}`
- body iframe: `/report/viewer.do?rcpNo=...&dcmNo=...&eleId=...&offset=...&length=...&dtd=...`
- TOC data: shell-embedded `treeData`
