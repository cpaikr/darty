# CLI v1 compatibility corpus

This corpus is the implementation-neutral process boundary retained through
the Rust repository cutover. It runs a supplied command in a fresh process
for every scenario and compares exit status, stdout framing and value, and
stderr without importing product code.

Help expectations compare the exact long-option set plus hand-authored,
whitespace-normalized semantic fragments. This preserves descriptions,
defaults, examples, and cautions without coupling a later Clap implementation
to historical Commander's line wrapping.

The checked-in expectations were authored from
[`docs/specs/cli-transport-v1.md`](../../../docs/specs/cli-transport-v1.md), the
capability specs, and the reviewed inventory below. There is intentionally no
snapshot-update command: a behavior change requires a spec decision and direct
golden review.

## Profiles

- `process` covers root discovery, all operation help and validation, and static
  results without network calls. Use it for production standalone executables.
- `full` covers every scenario, including fixture-backed operation results,
  projections, viewer handoffs, and transport faults. It requires a Rust build
  with the test-only `fixture-origin` feature; production binaries contain no
  fixture seam.

Production archive checks combine the network-free process contract with
separately authorized live workflows. Repository cutover is complete; the
[release runbook](../../../docs/release.md) owns remaining certification, signoff,
and publication gates. The Rust CLI is not yet published.

## Running

```bash
# Build a separate fixture-enabled Rust executable and run all scenarios.
bun run test:compat:cli

# Check an exact production executable without contacting DART.
node scripts/judge-cli-v1.mjs --profile process -- /absolute/path/to/darty

# Verify that the judge rejects a deliberate transport-version mutation.
bun run build
bun run test:compat:cli:mutation
```

The mutation proof wraps the executable in a disposable subprocess adapter that
changes only the emitted transport version. The independent judge must reject
that output; source and production executables remain unchanged. `DARTY_CLI`
can select an exact installed executable for this proof.

## Reviewed inventory

| Operation | Required inputs | Optional public inputs | CLI-only presentation | Success and references |
| --- | --- | --- | --- | --- |
| `search-company` | `companyName` (trimmed, min 2) | `page` 1–100; `pageSize` 1–45 | `pretty`, `verbose`, `agent` | Request, pagination, company rows and `detailEndpoint`; top-level `searchUrl`; agent rows retain company identifiers and references. |
| `search-company-reports` | 8-digit `companyCode`; real ordered `startDate`/`endDate` within 10 years | Page, page size, direction, presenter/report filters, repeated disclosure type, industry/corporation/closing filters, include-all, detail | `pretty`, `verbose`, `agent` | Selected company, pagination, filing rows and `viewerUrl`; top-level `searchUrl`; agent rows retain receipt/company handoffs. Page sizes 5/10 are compatibility aliases normalized to 15. |
| `search-body` | `keyword`; real ordered `startDate`/`endDate` | Company/presenter/report filters, page, sort, direction, detail | `pretty`, `verbose`, `agent` | Pagination, filing/match rows and `viewerUrl`; top-level `searchUrl`; agent rows retain receipt and viewer handoffs. |
| `view-report` | 14-digit receipt or viewer URL containing `rcpNo` | Returned `documentId`/`sectionId`, format, 1,000–1,000,000 byte limit, nonnegative rendered byte start, detail | `pretty`, `verbose`, `tocDepth` | Documents, TOC, selected content/window/navigation and viewer URL; contextual continuation help. Raw viewer locators are not public inputs. |
| `company-detail` | 8-digit `companyCode` | None | `pretty` | Normalized company detail and `detailUrl`. |
| `company-rss` | 8-digit `companyCode` | Detail | `pretty` | RSS channel/items and `rssUrl`. |
| `disclosure-types` | None | Category and query | `pretty` | Static code groups and pinned source reference. |
| `report-guide` | None | None | None | Human-readable Markdown instead of a JSON success envelope. |

Capability executions return one JSON envelope plus LF on stdout and exit 0;
typed failures return the failure envelope plus LF and exit 1. Help and
`report-guide` are text exceptions. Default stderr is empty; safe diagnostics
may appear only under the documented debug/verbose controls. Search agent
projections omit evidence and low-value metadata while preserving identifiers,
references, and `help[]`. `view-report` has no agent mode but provides TOC,
section, and continuation hints.

The frozen historical npm baseline is `@sjunepark/darty@0.5.0`: `darty` points to
`dist/cli.js`, exports are `./toolset` and `./package.json`, and packed contents
are `dist`, `README.md`, and `LICENSE.md`. The implementation commit recorded in
[`baseline.json`](baseline.json) is the code identity beneath the later
planning and judge commits.

Company guidance has hand-reviewed fictional cases for unique, ambiguous,
misleading-first, empty, partial, and paginated results. A concrete company
handoff is conditional on identity and requires complete singleton pagination;
other nonempty results require selecting a returned name/code. Candidate order,
identifiers, SDK semantics, and zero-result recovery are unchanged.

## Four-step acceptance workflow

The opt-in live workflow remains:

1. `search-company --agent` returns `companyCode`.
2. `search-company-reports --agent` consumes it and returns `receiptNumber`.
3. `view-report --toc-depth 1` consumes the receipt and returns `toc[].id`.
4. `view-report --section-id ...` consumes that ID and returns a bounded content
   window.

Live DART verifies provider access separately; it does not generate or update
this deterministic corpus.
