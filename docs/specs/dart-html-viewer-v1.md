# DART HTML and Viewer Companion v1

Status: canonical upstream companion contract for the Rust implementation’s
`dart-wire-v1` subset.

This document owns the language-neutral response-decoding, HTML-fragment, and
viewer-shell rules that OpenAPI cannot express. The HTTP methods, routes,
headers, form fields, and query parameters are owned only by
[`dart-wire-v1.openapi.yaml`](dart-wire-v1.openapi.yaml). Public request,
result, identifier, projection, and error-envelope behavior remains in the
capability specs.

Research and fictional fixtures are evidence for this contract, not competing
authorities. Every source claim below is labeled `observed`, `inferred`,
`project decision`, or `unknown`.

## Scope and transport policy

- `WIRE-SCOPE-1` — **Project decision.** The authority covers exactly
  `searchCompanyFragment`, `searchCompanyReportsFragment`, `searchBodyFragment`,
  `fetchCompanyDetail`, `fetchCompanyRss`, `fetchReportShell`, and
  `fetchReportContent`. PDF, XBRL, popup lookup, and every other DART route
  are excluded. Static disclosure types and report guide need no upstream call.
- `WIRE-STATUS-1` — **Project decision.** Only HTTP 200 is parsed. Network
  failures, timeouts, redirects, and non-200 responses become sanitized,
  retryable `source_unavailable` failures. The client performs no automatic
  retry.
- `WIRE-REDIRECT-1` — **Project decision.** Automatic redirects are disabled.
  This prevents a locator from silently crossing the DART origin.
- `WIRE-TIMEOUT-1` — **Project decision.** Connect timeout is 5 seconds, idle
  read timeout is 10 seconds, and total request deadline is 30 seconds. The
  fast fixture fault labelled `source-connect-timeout` is an accepted-socket
  header-delay transport-failure equivalent; it is not evidence of a
  connect-timeout duration. The production defaults are asserted directly in
  the Rust transport unit tests, while phase-specific timeout behavior uses
  injected fixture deadlines.
  Cancellation must stop an in-flight request promptly; public cancellation
  projection is owned by each SDK surface rather than this wire contract.
- `WIRE-SIZE-1` — **Project decision.** Raw response bytes are capped before
  decoding: 8 MiB for each search fragment, company detail, or RSS feed;
  16 MiB for a report shell; and
  64 MiB for report content. A stream that reaches cap + 1 fails without
  parsing as `source_parse_failure`.
- `WIRE-CONTENT-TYPE-1` — **Project decision, based on observed responses.** A
  HTML response must have media type `text/html`. RSS accepts `application/xml`,
  `text/xml`, or `application/rss+xml`. Compare case-insensitively and ignore
  parameters. Missing or different media types fail as `source_parse_failure`.

## Decoding

- `DECODE-CHARSET-1` — **Observed.** DART report content has returned both
  `charset=utf-8` and `charset=MS949`.
- `DECODE-CHARSET-2` — **Project decision.** Charset tokens `ms949`, `euc-kr`,
  and `ks_c_5601-1987`, compared case-insensitively, select the WHATWG EUC-KR
  decoder. `utf-8`, `utf8`, or a missing charset selects UTF-8. Any other
  declared charset fails as `source_parse_failure`.
- `DECODE-MALFORMED-1` — **Project decision for TypeScript compatibility.**
  Decoding replaces malformed byte sequences. Required parser grammar still
  has to validate; replacement characters do not relax structural checks.

## Company-search fragment

These rules consume `searchCompanyFragment`.

- `COMPANY-TABLE-1` — **Observed.** Result rows are direct `tr` descendants of
  `#corpTable tbody`. A recognized empty response contains
  `#corpTable tbody tr.noData`.
- `COMPANY-ROW-1` — **Observed.** A usable row contains a company link whose
  `href` matches `select('<eight digits>')`; its collapsed link text is the
  company name. The first titled badge supplies optional market label and
  badge evidence. The second direct `td` contains either an empty value or a
  six-digit stock code.
- `COMPANY-PAGE-1` — **Observed.** Non-empty pagination text matches
  `[current/total] [총 count건]`, allowing commas in `count`. The empty shape has
  zero total pages and count while preserving the requested current page.
- `COMPANY-PARTIAL-1` — **Project decision.** Unusable result rows are dropped
  and counted. A response with recognized table and pagination grammar may
  still succeed with a partial-row warning. Missing required table/pagination
  grammar is `source_changed`.

## Company-report fragment

These rules consume `searchCompanyReportsFragment`.

- `REPORTS-TABLE-1` — **Observed.** Result rows are direct `tr` descendants of
  `table.tbList tbody`. A recognized empty response contains a `td.no_data` or
  a spanning `td` whose collapsed text is `조회 결과가 없습니다.`.
- `REPORTS-ROW-1` — **Observed.** A usable row has six cells. Cell 2 contains a
  company link whose `href` includes `openCorpInfoNew('<eight digits>', ...)`.
  Cell 3 contains a report link beginning `/dsaf001/main.do` and a 14-digit
  `rcpNo` query. Cells 4 and 5 supply presenter and dotted receipt date. Cell 6
  supplies zero or more remark spans; title text is retained when present.
- `REPORTS-PAGE-1` — **Observed.** Non-empty pagination uses the same
  `[current/total] [총 count건]` grammar as company search. The upstream empty
  source model has zero total pages and count; public normalization is owned by
  the capability spec.
- `REPORTS-PARTIAL-1` — **Project decision.** Unusable result rows are dropped
  and counted. Recognized table and pagination grammar may still succeed with
  a partial-row warning. Missing required grammar is `source_changed`.

## Body-search fragment

These rules consume `searchBodyFragment`. Their grammar is retained from the
TypeScript source tests and earlier source-map observations; the fictional
corpus does not establish refreshed live provider qualification.

- `BODY-TABLE-1` — **Observed and retained baseline behavior.** Use the first
  `table.tbWideList` and its first direct `tbody`, with direct result `tr` rows.
  Require numeric total count from `#totalCnt[value]` or `#searchCnt` text.
  Non-empty results require `.pageInfo` matching `[current/total] [총 count건]`.
  Missing table, rows, count, or required pager is `source_changed`.
- `BODY-EMPTY-1` — **Project decision from observed empty grammar.** A spanning
  cell with collapsed text `조회 결과가 없습니다.` is the empty sentinel,
  whether the source placed it directly in `tbody` or inside a row. Require
  exactly one sentinel, no data rows/cells, total count zero, and zero total
  pages when a pager is present. Without a pager return page 1 and zero total
  pages. Mixed empty/data grammar is `source_changed`.
- `BODY-ROW-1` — **Observed and retained baseline behavior.** `a.company` gives
  the company name and optional `openCorpInfoNew('<eight digits>', ...)` code;
  `.companyName > span[title]` gives optional market label. `a.second` supplies
  report title and viewer reference. First `td` contains snippet HTML/text;
  `td.info` supplies bracketed disclosure/content labels and `제출인 :` text;
  `td.date` supplies the receipt date, converting dotted dates to ISO form.
  Split an initial bracketed report modifier, first parenthesized period, and
  trailing suffix without losing the raw title.
- `BODY-REFERENCE-1` — **Project decision.** Resolve relative report links
  against DART. Require the fixed origin, `/dsaf001/main.do`, no userinfo, and
  exactly one 14-digit `rcpNo`. If a company filter was requested, its code must
  match the row. Drop and count rows failing these checks; preserve successful
  rows and expose partial-row warnings. Detailed/raw adds `evidence` containing
  snippet HTML, raw report title, and raw info text, plus optional
  `filing.documentNumber` (`dcmNo`); concise omits these. No full response body is
  returned by any projection.
- `BODY-PARTIAL-HELP-1` — **Project decision.** When all rows on a source page
  are dropped, CLI help states that no parseable rows remain, rather than
  claiming no filings matched. This corrects the historical TypeScript helper;
  genuine empty-result wording is unchanged.

## Company-detail fragment

These rules consume `fetchCompanyDetail`.

- `DETAIL-TABLE-1` — **Observed and retained baseline behavior.** Require
  `#corpDetailTable`. Read each `tbody tr` first `th` as the field label and
  first `td` as the value, collapsing whitespace and removing button, script,
  and style content. Missing table or `회사이름` label is `source_changed`;
  a present but empty company-name value is `not_found`.
- `DETAIL-NOT-FOUND-1` — **Project decision.** A recognized empty company detail
  table produces typed `not_found`. The historical TypeScript source parser returned
  not-found, but its Effect promise bridge wrapped the error and the capability
  reported `internal_error`. Rust corrects that propagation bug; the
  CLI golden records this explicit baseline divergence.
- `DETAIL-FIELDS-1` — **Retained baseline behavior.** The capability spec owns
  the optional field set. Empty optional fields are omitted. Homepage prefers
  the first link's non-empty `href` over visible text. The requested eight-digit
  company code remains the result identity; homepage links are data, never
  destinations fetched by this operation.

## Company RSS

These rules consume `fetchCompanyRss`.

- `RSS-CHANNEL-1` — **Observed and retained baseline behavior.** Parse in XML
  mode and select the first `channel`. Require non-empty direct `title` and
  `link` children. Missing channel or required text is `source_changed`.
- `RSS-ITEM-1` — **Retained baseline behavior.** Read direct `item` children
  in order; every item requires direct non-empty `title` and `link`. A missing
  required field fails the whole feed as `source_changed`, without a partial
  result. Collapse text whitespace. `dc:date` or `date` takes priority over
  `pubDate`; `dc:creator` or `creator` supplies creator. Preserve optional `guid`.
  Receipt extraction requires an absolute parseable link with a 14-digit
  `rcpNo`; other links remain data without a receipt identifier.
- `RSS-PROJECTION-1` — **Project decision preserving CLI v1.** Concise output
  retains channel title/link and item title/link/receipt/date/creator. Detailed
  and raw additionally retain channel description/language/date and item guid.
  An empty recognized channel is successful with zero items and no invented
  no-results warning. Raw never returns the complete source XML.
- `RSS-FAILURE-1` — **Project decision.** Transport bounds and decoding rules
  apply before parsing. Unsupported media type, excessive response bytes, or
  inability to safely produce the source model is `source_parse_failure`.
  Missing required XML structure is `source_changed`.
- `RSS-XML-1` — **Project decision.** Require well-formed XML, prohibit DTDs
  and entity resolution, and cap the parsed tree at 100,000 nodes in addition
  to the 8 MiB byte bound. Malformed XML, a DTD, or node overflow is
  `source_parse_failure`. Resolve Dublin Core fields by namespace URI
  `http://purl.org/dc/elements/1.1/`, not by the spelling of its prefix; also
  accept unnamespaced `date`/`creator`. The selected Rust parser is `roxmltree`
  with DTD support disabled. The TypeScript baseline used permissive XML
  recovery and lexical `dc:` matching; this stricter bounded source acceptance
  is an explicit Rust safety decision, not observed cross-language parity.

## Report shell and viewer replay

These rules consume `fetchReportShell` and produce the only locators accepted
by `fetchReportContent`.

- `SHELL-DOCUMENTS-1` — **Observed.** Non-placeholder options under `#family`
  are body documents; options under `#att` are attachments. An option value is
  a query containing `rcpNo` and, for attachments, optionally `dcmNo`.
  The first selectable option carrying `selected` identifies the current
  document; when none carries it, the first selectable body or attachment
  option in parse order is current. The title attribute wins over collapsed
  option text when non-empty.
- `SHELL-TREE-1` — **Observed.** The shell initializes `treeData` through
  JavaScript statements that create `nodeN = {}`, assign string fields, push
  child nodes, and push roots into `treeData`. Required section fields are
  `text`, `rcpNo`, `dcmNo`, `eleId`, `offset`, `length`, and `dtd`; `tocNo` is
  optional metadata. Incomplete nodes are not addressable sections.
- `SHELL-TREE-IDENTITY-1` — **Observed, 2026-09-08.** A variable such as
  `node1` may be assigned a fresh object repeatedly. Each creation establishes
  a distinct node; child/root pushes retain that object's identity even after
  the variable is reassigned. Later field writes affect the currently bound
  object. Do not resolve pushed references through the final variable binding.
- `SHELL-TREE-EXECUTABLE-1` — **Project decision.** Only supported statements
  in executable script content establish viewer state. Matching text inside
  comments, quoted strings, template literals, or regular-expression literals
  is not evidence. Declared but unusable node roots fail closed.
- `SHELL-TREE-GRAPH-1` — **Project decision.** Cycles, orphan objects, the same object in multiple tree positions,
  roots reused across documents, mixed receipt/document identity, or references to
  undeclared nodes are `source_changed`. Every
  addressable node must bind to the shell receipt and its selected document.
- `SHELL-TREE-BOUNDS-1` — **Project decision.** Reject trees deeper than 64
  levels (roots are level 1) or containing more than 10,000 objects across the
  complete root forest as `source_changed`. Orphan objects are rejected.
  These bounds limit recursive work inside the transport byte bound. Reusing
  one object in multiple tree positions is rejected by the graph rule, rather
  than expanded repeatedly.
- `SHELL-TREE-CONFORMANCE-1` — **Project decision.** Rust excludes regex-literal
  text and requires explicit no-TOC initialization. Only executable script types
  are interpreted. This intentionally rejects fake tree statements inside inert
  data scripts that the TypeScript baseline could accept. The graph and depth
  limits above are bounded acceptance rules, not claims about JavaScript execution.
- `SHELL-INITIAL-1` — **Observed.** The initial selected locator is the first
  syntactically valid `viewDoc(rcpNo, dcmNo, eleId, offset, length, dtd[, tocNo])`
  call. `tocNo` is shell metadata and is not sent to `fetchReportContent`.
- `SHELL-NO-TOC-1` — **Observed.** A shell may have no TOC and an initial
  locator with `eleId=0`, `offset=0`, and `length=0`; that locator retrieves the
  selected full HTML document. Observed no-TOC evidence initializes
  `treeData=[]` explicitly.
- `SHELL-NO-TOC-2` — **Project decision.** Explicit executable initialization
  to `treeData=[]` is the only accepted no-TOC shape; missing or ambiguous tree
  initialization is `source_changed`.
- `SHELL-SELECTION-1` — **Project decision.** Callers may select only a query
  returned by a parsed document option. Raw viewer locators remain internal.
- `SHELL-CHANGED-1` — **Project decision.** A shell without a receipt number
  and at least one selectable document is `source_changed`. Invalid string
  decoding or an otherwise undecodable source model is `source_parse_failure`.
- `VIEWER-LOCATOR-1` — **Observed.** `rcpNo`, `dcmNo`, `eleId`, `offset`,
  `length`, and `dtd` are copied verbatim from the selected shell locator into
  `fetchReportContent`. Offset and length units remain **unknown**.
- `VIEWER-CONTENT-1` — **Project decision.** Viewer content is decoded before
  sanitization. HTML sanitization, Markdown conversion, public content windows,
  and opaque public document/section IDs are capability behavior, not wire
  grammar, and are tested in the Rust implementation.

## Evidence and conformance

The cross-language corpus at [`../../fixtures/dart/vertical-v1/`](../../fixtures/dart/vertical-v1/)
and [`../../fixtures/dart/parity-v1/`](../../fixtures/dart/parity-v1/)
are independently fictional evidence. Their manifests point to OpenAPI operation
IDs and the stable rule IDs above. Conformers must match actual method, path,
headers, form/query fields, and response bytes; selecting a fixture by scenario
name alone is not conformance.

Provider access and operational suitability are recorded separately in
[`../research/dart-provider-qualification.md`](../research/dart-provider-qualification.md).
