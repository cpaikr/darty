# Architecture

This repo is a documentation system for the future DART tool implementation. The architecture is the document boundary: each file should own one layer of the design, and shared guidance should live in exactly one canonical place.

## Document Ownership

- [README.md](README.md)
  Orientation, repo stance, and reading order.
- [VISION.md](VISION.md)
  Product-level goal, scope, and non-goals for the current project.
- [ROADMAP.md](ROADMAP.md)
  Strategic direction, milestones, and intentional deferrals.
- [TODO.md](TODO.md)
  Ordered near-term queue of concrete candidate tasks.
- [PLAN.md](PLAN.md)
  The one active detailed plan for the current job.
- [docs/research/dart-source-map.md](docs/research/dart-source-map.md)
  Durable source investigation notes for DART, OpenDART, and the report viewer.
- [docs/tools/](docs/tools/)
  Canonical home for single-tool design.
- [docs/specs/](docs/specs/)
  Stable, evidence-backed capability specs once the contract is ready.

## Contributor Flow

1. Start with [README.md](README.md).
2. If the work is about the current product, read [VISION.md](VISION.md) first.
3. Use [docs/research/dart-source-map.md](docs/research/dart-source-map.md) to understand what the live source actually exposes today.
4. Put strategic sequencing in [ROADMAP.md](ROADMAP.md), the near-term queue in [TODO.md](TODO.md), and the active job breakdown in [PLAN.md](PLAN.md).
5. Use [docs/tools/foundations.md](docs/tools/foundations.md) and the linked tool docs to shape the contract.
6. Promote only evidence-backed, implementation-ready capability specs into [docs/specs/](docs/specs/README.md).
7. Keep tool rules in the tool docs; link to canonical guidance instead of duplicating it.

## Invariants

- Keep product vision at the repo root, not mixed into specs or plans.
- Keep roadmap, todo, and the one active plan at the repo root.
- Keep source investigation notes outside `docs/specs/`; only promote stable contract decisions into specs.
- Keep tool contract rules in [docs/tools/contracts.md](docs/tools/contracts.md), not in project notes.
- Prefer links to canonical guidance over repeating the same rule in multiple files.
- Mark source observations as observed, inferred, or unverified; do not blur them together.

## Expected Expansion

If implementations are added later, preserve the same split:

- `docs/specs/` for stable capability specs
- `packages/core` or similar for capability logic
- `packages/cli` for local scripting and human debugging
- `packages/mcp` only after the core contract is stable
- `evals/` for scenario-driven tests and transcripts
