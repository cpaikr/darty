# dsaf001 Report View v1

Status: implemented initial contract.

## Purpose

`view-report` resolves a DART receipt into the viewer document context and uses
progressive disclosure for report content:

1. call with a receipt number or viewer URL to get documents and TOC
2. call again with a returned `sectionId` to get sanitized HTML for one section

The tool is read-only and hides DART's raw viewer parameters (`dcmNo`, `eleId`,
`offset`, `length`, `dtd`) behind stable tool IDs.

## Request

Required:

- `receipt`: bare DART receipt number or `/dsaf001/main.do?rcpNo=...` URL. If the URL also includes `dcmNo`, the tool uses it internally to select that document.

Optional:

- `documentId`: a returned `documents[].id`; defaults to the selected body document
- `sectionId`: a returned `toc[].id`; used only to fetch one TOC section
- `outputFormat`: currently only `html`, default `html`
- `maxBytes`: maximum returned HTML bytes, default `200000`

## Response Behavior

- TOC-backed documents return `documents` and `toc` without content unless a
  `sectionId` is supplied.
- Section calls return sanitized HTML plus parent/previous/next/children
  navigation when available.
- Documents with no DART TOC return the selected document HTML by default when
  `sectionId` is omitted and add a `no_toc_returned_document` warning.
- Oversized HTML is truncated and adds a `content_truncated` warning.
- `metadata.source.endpoints.shell` records the viewer shell endpoint. When HTML
  content is returned, `metadata.source.endpoints.content` records the iframe
  content endpoint without exposing raw DART viewer params.

## Source Basis

Implemented against observed DART viewer behavior in
[`docs/research/dart-source-map.md`](../research/dart-source-map.md):

- entry shell: `/dsaf001/main.do?rcpNo={receiptNumber}`
- body iframe: `/report/viewer.do?rcpNo=...&dcmNo=...&eleId=...&offset=...&length=...&dtd=...`
- TOC data: shell-embedded `treeData`
