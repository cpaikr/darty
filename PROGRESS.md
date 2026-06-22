# AXI Agent UX Progress

## Objective

Implement the agreed AXI-aligned improvements:

- compact agent output for search results
- contextual success `help[]` next-step hints
- useful no-args CLI home view
- CLI transport spec drift fix
- multi-step workflow eval coverage

## Status

- 2026-06-22: Implemented the agreed AXI improvements and validation passed.
- 2026-06-22: Post-implementation review applied two Bucket I fixes: pagination
  help now preserves active filters, and the CLI home view uses typed warning
  objects.

## Decisions

- Preserve current default CLI success JSON compatibility where practical.
- Add an explicit `--agent` presentation mode for compact search output instead
  of replacing the existing default output in the same change.
- Keep capability result schemas unchanged; AXI-focused shaping belongs to CLI
  presentation modules and eval surfaces.
- Treat missing required command inputs as structured JSON failures, matching
  current runtime and tests. Update the CLI transport spec rather than changing
  runtime behavior to no-option help.

## Checklist

- [x] Add `--agent` compact output for search commands.
- [x] Add contextual `help[]` to successful CLI projections.
- [x] Replace root no-args help with a compact home view.
- [x] Update `docs/specs/cli-transport-v1.md` for command-with-no-options
      behavior.
- [x] Add CLI workflow evals for company lookup, filing search, report TOC, and
      section retrieval.
- [x] Run focused tests, typecheck, full tests, build, and workflow eval.

## Validation

- `bun run typecheck` passed.
- Focused CLI/presentation tests passed:
  `bun test src/cli/presentation/search.test.ts src/cli/presentation/view-report.test.ts src/cli/commands/search-company.test.ts src/cli/commands/search-body.test.ts src/cli/commands/search-company-reports.test.ts test/cli/search-body-cli.test.ts test/cli/cli-entrypoints.test.ts`
- `bun test` passed: 335 pass, 23 live tests skipped, 0 fail.
- `bun run build` passed.
- `bun run eval:workflow:cli` passed with four live handoff steps:
  company lookup, company filing search, report TOC, and report section.
- Post-review validation reran `bun run typecheck`, focused CLI tests,
  `bun test`, `bun run build`, and `bun run eval:workflow:cli`; all passed.
