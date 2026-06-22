# AXI Upstream Baseline

This repo tracks the upstream AXI project so agent-facing CLI decisions can be
reviewed when AXI evolves.

## Current Baseline

- Upstream: <https://github.com/kunchenguid/axi>
- Branch: `main`
- Baseline commit:
  [`8447811bd42da136759454e2e710cb03d7ccadf7`](https://github.com/kunchenguid/axi/commit/8447811bd42da136759454e2e710cb03d7ccadf7)
- Observed: `2026-06-22`
- Machine-readable baseline: [`axi-baseline.json`](axi-baseline.json)

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
