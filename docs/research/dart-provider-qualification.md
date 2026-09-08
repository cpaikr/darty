# DART Website Provider Qualification

Status: technical live evidence refreshed for all six source-backed operations;
maintainer production approval remains pending. Viewer drift is technically
reconciled; explicit maintainer requalification is still required.
Owner: Darty maintainers.
Last reviewed: 2026-09-08.

This record evaluates whether the DART website is operationally suitable for
bounded, read-only use by the candidate. It is not protocol authority, a public
capability contract, legal approval, release authorization, an SLA, or a claim
that DART endorses this client. HTTP rules live in the
[`dart-wire-v1` OpenAPI](../specs/dart-wire-v1.openapi.yaml); HTML/viewer rules
live in its [companion contract](../specs/dart-html-viewer-v1.md).

Evidence labels in this document are `documented`, `observed`, `inferred`,
`project decision`, and `unknown`.

## Qualification decision

| Candidate operation | State | Evidence | Unknowns | Recheck trigger |
|---|---|---|---|---|
| `search-company` | conditional technical evidence | **Observed, 2026-09-08:** release-built Rust CLI search for `삼성전자` returned six rows. | Official availability, rate limits, and geographic policy. | Access failure, redirect, parser drift, or DART policy notice. |
| `search-company-reports` | conditional technical evidence | **Observed, 2026-09-08:** company `00126380`, dates `20260330`–`20260331`, returned four rows. | Stability of every accepted filter and official service policy. | Access or grammar failure, misleading empty result, or DART policy notice. |
| `view-report` | technical drift resolved; maintainer requalification pending | **Observed, 2026-09-08:** receipt `20260331000460` returned four distinct TOC roots; `section:1` returned 868 bytes with `hasMore=false`. The original TypeScript CLI `source_changed` failure was reproduced. | Maximum document sizes, locator offset/length units, and official availability. | Reproducible shell/content grammar failure or unsupported source behavior. |
| `search-body` | conditional technical evidence | **Observed, 2026-09-08:** keyword `배당`, dates `20260330`–`20260331`, returned ten rows; source total 6,722 and 673 pages. | Stability of all accepted filters and body-search behavior outside this probe. | Access or grammar failure, paging drift, or increasing dropped rows. |
| `company-detail` | conditional technical evidence | **Observed, 2026-09-08:** company `00126380` returned a successful normalized detail result. | Coverage of optional fields across companies and official availability. | Missing required table/name grammar or DART policy notice. |
| `company-rss` | conditional technical evidence | **Observed, 2026-09-08:** company `00126380` returned a valid empty channel with zero items. | Current populated-item behavior was not observed in this refresh; fictional fixtures cover item parsing. | Invalid channel/item grammar, media-type drift, or DART policy notice. |

Conditional technical evidence supports continued bounded candidate validation;
it does not grant production approval. Deterministic conformance and repository
review remain required. The viewer's source discrepancy has a technical
resolution, but its separate maintainer requalification gate remains open.
Static `disclosure-types` and `report-guide` make no provider requests and need
no live provider qualification. Unknowns do not establish qualification.

## Maintainer approval records

This section is the canonical location for explicit maintainer decisions about
provider qualification and operation/surface acceptance. Evidence, fixtures,
deterministic checks, and bounded live probes do not constitute approval by
themselves. No approval records are currently recorded for the operations
above; do not infer one from this document's status or review date.

Append one record for each reviewed operation/surface. Use an immutable
evidence revision (for example, a source commit or reviewed lock revision),
not a date alone. The required schema is:

| Field | Required value |
|---|---|
| `approver` | Named maintainer handle or name who made the decision. |
| `date` | Decision date in `YYYY-MM-DD` format. |
| `evidence revision` | Exact revision of the reviewed provider evidence and contracts. |
| `limitations` | Remaining scope, operational, provider, or platform limitations; use `none recorded` only when explicitly reviewed. |
| `operation/surface` | The qualified operation and public surface, such as `search-company / Rust SDK`. |
| `decision` | Explicit outcome, such as `approved`, `conditional`, `rejected`, or `withdrawn`. |

Use this template when adding a real decision; placeholders are not approval
records:

```md
### Approval record — <operation/surface> — <date>

- approver: <named maintainer>
- date: <YYYY-MM-DD>
- evidence revision: <immutable revision>
- limitations: <remaining limitations>
- operation/surface: <operation> / <public surface>
- decision: <approved | conditional | rejected | withdrawn>
```

## Evidence register

- **Documented:** DART's public search guide describes human-facing integrated
  search concepts. It does not document these HTML endpoints as a supported
  replay API. Source and observation date are recorded in
  [`dart-source-map.md`](dart-source-map.md).
- **Observed, 2026-03-31 through 2026-05-24:** methods, fields, selectors,
  viewer locators, UTF-8/MS949 responses, filters, and the ten-year filing
  window were replayed as recorded in the source map.
- **Observed, 2026-08-22:** five bounded metadata-only requests completed
  without authentication, cookies, redirects, or retained bodies. All returned
  HTTP 200 and `text/html`; sizes ranged from 4,753 to 71,132 bytes and elapsed
  time from 0.117 to 0.512 seconds.
- **Observed, 2026-08-23:** company resolution and filing search succeeded in
  live workflow runs, but report viewing for selected receipt
  `20260331000460` reproducibly failed closed as `source_changed`. No live body
  was retained.
- **Observed, 2026-09-08:** bounded reproduction fetched the affected viewer
  shell as HTTP 200 UTF-8, 36,671 wire bytes. Its four fresh `node1 = {}`
  creations and four root pushes require object identity across rebinding.
  The old TypeScript CLI failed as `source_changed`; the old Rust parser
  repeated the last root. The corrected Rust CLI returned four distinct roots.
- **Observed, 2026-09-08:** the release-built Rust CLI completed the serial
  company → filings → viewer → section workflow and the body/detail/RSS probes
  listed above, with at least 250 ms between requests. Live bodies remained
  in memory; only bounded result counts and public identifiers were retained.
  This is technical source evidence, not human approval or release signoff.
- **Inferred:** the tested routes are usable for low-volume public reads from
  the current host. This does not imply availability from every network or at
  production volume.
- **Unknown:** official API stability, rate limits, uptime commitment,
  geographic restrictions, and advance change notification.

## Access

- **Observed:** the five 2026-08-22 probes required no login, session cookie,
  credential, or browser automation and did not redirect.
- **Project decision:** the candidate sends only public read requests, a
  non-empty identifying user agent, and the endpoint-specific referers in the
  canonical OpenAPI contract. It does not attempt to bypass access controls.
- **Unknown:** whether DART applies network, geographic, user-agent, or volume
  policies that were not visible in the bounded probes.

## Pacing

- **Project decision:** one in-flight DART request per SDK client and at least
  250 milliseconds between request starts. Multi-step workflows remain
  sequential.
- **Project decision:** no burst pool or background crawling is qualified.
- **Unknown:** DART does not provide an official limit in the evidence held by
  this repository. The local policy is conservative and is not presented as an
  upstream allowance.

## Retries, timeout, and cancellation

The candidate performs one attempt and no automatic retry. Public
`retryable=true` means a caller may make a new, paced request; it never means an
unbounded internal loop.

| Condition | Candidate classification | Automatic retry |
|---|---|---:|
| connect failure, timeout, cancellation, or connection reset | sanitized transport outcome; source failures are retryable, cancellation remains surface-owned | no |
| HTTP 429 | retryable `source_unavailable`; retain only sanitized status and bounded `Retry-After` metadata if present | no |
| HTTP 403 or 404 | retryable `source_unavailable`; trigger qualification review when unexpected | no |
| other 4xx | retryable `source_unavailable` | no |
| HTTP 5xx | retryable `source_unavailable` | no |
| redirect | retryable `source_unavailable` plus qualification review | no |
| unexpected media type, charset, oversize body, or decode failure | non-retryable `source_parse_failure` | no |
| required HTML/XML/viewer grammar drift | non-retryable `source_changed` | no |

Transport deadlines and byte limits are canonical project decisions in the
HTML/viewer companion. A caller retry must pass the same validation, pacing,
and cancellation controls as its first attempt.

## Retention

- **Project decision:** retain independently fictional fixtures, their hashes,
  sanitized request shapes, status/content-type/byte-count probe metadata, and
  concise parser counts.
- **Project decision:** do not retain unrestricted live response bodies,
  cookies, credentials, request identifiers beyond public filing/company IDs,
  or unrelated personal data.
- **Project decision:** live response bodies may exist only in memory for the
  bounded request and must not be written into test fixtures or logs.

## Monitoring

There is no continuous provider monitor yet.

- **Project decision:** deterministic fixtures and contract validation run in
  repository CI. They prove conformance, not live availability.
- **Project decision:** bounded live qualification is manual and opt-in. The
  Darty maintainers own review after any trigger in the decision table and
  before expanding provider use or platform claims.
- **Signals:** unexpected status/redirect/media type/charset, timeout rate,
  size-limit failures, dropped-row growth, parser drift, and changed DART
  documentation or access policy.
- **Threshold:** any reproducible grammar/access failure in a seeded operation,
  or any access-policy concern, stops qualification for that operation pending
  review. A single transient transport failure is recorded but does not alone
  prove protocol drift.

## Withdrawal and requalification

Withdraw an operation when DART blocks access, requires authorization the
project does not have, redirects outside the approved origin, changes required
grammar, ordinary seeded responses exceed safety bounds, or publishes a policy
incompatible with this use.

Withdrawal means disabling or withholding the affected candidate operation;
it does not authorize fallback scraping, browser automation, credential use,
or a new provider. Requalification requires refreshed source evidence, updated
canonical contracts and fictional fixtures, deterministic conformance, a
bounded live probe, repository review, and an explicit maintainer decision.
