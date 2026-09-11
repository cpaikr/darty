# AXI Upstream Baseline

This repo tracks the upstream AXI project so agent-facing CLI decisions can be
reviewed when AXI evolves.

## Current Baseline

- Upstream: <https://github.com/kunchenguid/axi>
- Branch: `main`
- Baseline commit:
  [`46d02d35f46a173dec5bd6be18827684fd1e885c`](https://github.com/kunchenguid/axi/commit/46d02d35f46a173dec5bd6be18827684fd1e885c)
- Observed: `2026-08-23`
- Machine-readable baseline: [`axi-baseline.json`](axi-baseline.json)

The 2026-08-23 review covered AXI SDK releases 0.1.8 through 0.1.11 and the
later catalog-only commit that added `mssql-axi`. The catalog change does not
affect Darty. AXI's fail-loud unknown-flag guidance already matches Darty's CLI
parser and compatibility judge. Its SDK updater, session hooks, and version
fast path are not adopted because Darty does not use the AXI SDK.

## What Compliance Means Here

Darty is AXI-informed at the pinned commit, not a full AXI implementation.

Aligned areas:

- compact agent-facing CLI output
- stdout-first structured success and failure envelopes
- non-interactive command behavior
- contextual `help[]` next-step hints where they preserve useful identifiers
- bounded content windows for larger report bodies

Intentional differences:

- Darty's CLI Transport v1 uses a JSON envelope on stdout; AXI at the pinned
  baseline prefers TOON.
- Darty has no AXI session hook installer.
- Darty keeps human help and `report-guide` output outside the normal JSON
  command-result envelope.

## Drift Review

Run the local check with:

```bash
bun run check:axi
```

If AXI's `main` branch has advanced past `axi-baseline.json`, the local check
fails and prints a review report with commit and file changes. There is no
AXI upstream CI workflow.

When drift is reported:

1. Review upstream changes, especially the watched paths in
   [`axi-baseline.json`](axi-baseline.json).
2. Decide whether Darty's CLI contract, docs, tests, or evals need updates.
3. Make any required Darty changes.
4. Advance `baselineCommit`, `observedAt`, and the review summary here.
