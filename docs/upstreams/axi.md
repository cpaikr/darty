# AXI Upstream Baseline

This repo tracks the upstream AXI project so agent-facing CLI decisions can be
reviewed when AXI evolves.

## Current Baseline

- Upstream: <https://github.com/kunchenguid/axi>
- Branch: `main`
- Baseline commit:
  [`622a35b968ecfb7c7d9db40b837d57f4cd9dad71`](https://github.com/kunchenguid/axi/commit/622a35b968ecfb7c7d9db40b837d57f4cd9dad71)
- Observed: `2026-08-23`
- Machine-readable baseline: [`axi-baseline.json`](axi-baseline.json)

The 2026-08-23 review covered AXI SDK releases 0.1.8 through 0.1.11. AXI's
new fail-loud unknown-flag guidance already matches Darty's CLI parser and
compatibility judge. The new SDK-owned updater, session-hook lifecycle, and
dependency-free version fast path are not adopted: Darty does not use the AXI
SDK, keeps its frozen CLI Transport v1 surface, and remains a read-only DART
tool rather than a package-management or session-integration command.

## What Compliance Means Here

Darty is AXI-informed at the pinned commit, not a full AXI implementation.

Aligned areas:

- compact agent-facing CLI output
- stdout-first structured success and failure envelopes
- non-interactive command behavior
- contextual `help[]` next-step hints where they preserve useful identifiers
- bounded content windows for larger report bodies

Intentional differences:

- Darty's CLI Transport v1 uses a JSON envelope on stdout; AXI currently
  prefers TOON.
- Darty has no AXI session hook installer.
- Darty keeps human help and `report-guide` output outside the normal JSON
  command-result envelope.

## Drift Review

Run the local check with:

```bash
bun run check:axi
```

The scheduled GitHub Actions workflow runs the same check every Monday. If AXI's
`main` branch has advanced past `axi-baseline.json`, the workflow fails and
prints a review report with commit and file changes.

When drift is reported:

1. Review upstream changes, especially watched paths.
2. Decide whether Darty's CLI contract, docs, tests, or evals need updates.
3. Make any required Darty changes.
4. Advance `baselineCommit`, `observedAt`, and any relevant notes in this file.

## Watched Upstream Paths

The checker highlights these AXI paths because they are most likely to affect
Darty's agent-facing CLI contract:

- `README.md`
- `CONTRIBUTING.md`
- `.agents/skills/axi/SKILL.md`
- `packages/axi-sdk-js/README.md`
- `packages/axi-sdk-js/package.json`
- `packages/axi-sdk-js/src/`
- `packages/axi-sdk-js/test/`
