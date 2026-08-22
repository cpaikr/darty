# AGENTS.md

## Scope

- This repo is for a DART querying/searching tool, not only `본문내용` body search.
- The current code in `src/` and `test/` is an early slice, so do not mistake the first implementation path for the full product scope.
- Treat repo docs and the current code as the source of truth. Do not invent commands, packages, or product scope that the repo does not define.

## Read First

- Start with `README.md`.
- For product direction, read `VISION.md`.
- For active project work and rewrite sequencing, read `ROADMAP.md` and its
  linked current plan.
- For `dsab007` contract or parser work, read `docs/research/dart-source-map.md` and `docs/specs/dsab007-search-v1.md`.
- Use `ARCHITECTURE.md` for document ownership and placement.

## Commands

- Install deps: `bun install`
- Typecheck: `bun run typecheck`
- Test: `bun test`
- Build npm CLI: `bun run build`
- Live tests: `bun run test:live`
- Manual search check: `bun run search --keyword <text> --start-date YYYYMMDD --end-date YYYYMMDD`
- Do not add placeholder build, lint, or format commands to docs. Only document commands that exist in the repo.

## Where Changes Go

- Product scope and non-goals: `VISION.md`
- Live DART investigation and source evidence: `docs/research/dart-source-map.md`
- Stable, evidence-backed capability contracts: `docs/specs/`
- Shared tool-design guidance: `docs/tools/`
- Release automation and required secrets: `docs/release.md`
- Active project order: `ROADMAP.md`
- Scheduled work: `plans/`
- Unscheduled work: `tasks/`

## Release and Publishing

- Read `docs/release.md` before preparing release automation changes or manual fallback tags.
- Release Please owns normal version bumps and changelog updates; do not manually edit versions or changelogs unless doing the documented manual fallback.
- Use Conventional Commit messages. While the package is pre-1.0, normal `feat:` and `fix:` commits become patch releases; breaking commits using `!` or `BREAKING CHANGE:` become minor releases.
- Manual release tags must match `package.json` exactly: version `x.y.z` uses source tag `vx.y.z`.
- The current release workflow publishes npm only. Rewrite work may prepare a
  different target artifact shape only when authorized by the active plan;
  update `docs/release.md` before enabling or publishing it.

## Working Rules

- Keep diffs small and edit the canonical document instead of repeating guidance elsewhere.
- Distinguish between current implementation limits and intended product scope. Broader DART query/search work is in scope even when the current code only covers an initial slice.
- Keep the current implementation read-only and citation-first unless the repo docs change that contract.
- Preserve the current Bun, strict TypeScript, `effect`, and `cheerio`
  implementation as the runnable baseline until the rewrite plan's atomic
  cutover. Rewrite work follows the accepted Rust SDK, Node SDK, and CLI target
  in `VISION.md` and the active plan instead of extending TypeScript source
  behavior in parallel.
- Update nearby tests and docs in the same change when behavior, contracts, or evidence changes.
- Mark source claims as observed, inferred, or unverified when that distinction matters.
