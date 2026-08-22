# CLI v1 compatibility baseline

This corpus is the implementation-neutral process boundary for the TypeScript
baseline and rewrite candidates. It runs a supplied command in a fresh process
for every scenario and compares exit status, stdout framing and value, and
stderr without importing product code.

Help expectations compare the exact long-option set plus hand-authored,
whitespace-normalized semantic fragments. This preserves descriptions,
defaults, examples, and cautions without coupling a later Clap implementation
to Commander's line wrapping.

The checked-in expectations were authored from
[`docs/specs/cli-transport-v1.md`](../../../docs/specs/cli-transport-v1.md), the
capability specs, and the reviewed inventory below. There is intentionally no
snapshot-update command: a behavior change requires a spec decision and direct
golden review.

## Profiles

- `vertical` covers the candidate `search-company` →
  `search-company-reports` → `view-report` help and validation surface.
- `candidate` adds independently authored fixture-backed success, agent
  projection, TOC, and section-window expectations to the vertical profile.
- `full` also freezes the active root home, the other five operation entry
  paths, and the two deterministic static operations. It is the guard that the
  TypeScript comparison product remains unchanged while the candidate is built.

The current source adapters use fixed DART HTTPS endpoints. The deterministic
baseline therefore covers process transport, help, semantic validation, and
network-free operations without adding a test-only seam to the active product.
Fixture-backed successful searches and the four-step report workflow use the
candidate profile and the canonical wire authority's runtime-neutral
fake-upstream boundary. The active TypeScript product never receives that
test-only seam.

## Running

```bash
bun run test:compat:cli
bun run test:compat:cli:mutation

# Run help and validation compatibility against any candidate command.
node scripts/judge-cli-v1.mjs --profile vertical -- ./path/to/darty

# Run the retained Rust candidate's full vertical acceptance profile.
node scripts/judge-cli-v1.mjs --profile candidate -- ./path/to/darty
```

The mutation proof changes the transport version only in a disposable copy of
the built CLI and requires the judge to reject it. It never edits `src/` or the
normal `dist/cli.js` artifact.

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

The active npm baseline is `@sjunepark/darty@0.5.0`: `darty` points to
`dist/cli.js`, exports are `./toolset` and `./package.json`, and packed contents
are `dist`, `README.md`, and `LICENSE.md`. The implementation commit recorded in
[`baseline.json`](baseline.json) is the code identity beneath the later
planning and judge commits.

## Four-step acceptance workflow

The opt-in live workflow remains:

1. `search-company --agent` returns `companyCode`.
2. `search-company-reports --agent` consumes it and returns `receiptNumber`.
3. `view-report --toc-depth 1` consumes the receipt and returns `toc[].id`.
4. `view-report --section-id ...` consumes that ID and returns a bounded content
   window.

Live DART verifies provider access separately; it does not generate or update
this deterministic corpus.
