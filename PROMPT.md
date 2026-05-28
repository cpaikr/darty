# Prompt: Add Missing CLI Tests

You are working in `darty`. Your job is to audit the current CLI test coverage and add the missing tests for the current CLI surface.

Do not broaden product scope. Do not add new user-facing features unless a missing test requires a small, local testability seam.

## Goal

Strengthen test coverage for the current `search-body` CLI so it behaves like a reliable tool for agents and LLMs.

The priority is not human UX polish. The priority is deterministic tool behavior:

- stable argument parsing
- strict validation
- machine-friendly stdout
- errors on stderr
- non-zero exit codes on invalid use
- predictable help output

## Read First

1. `AGENTS.md`
2. `README.md`
3. `ARCHITECTURE.md`
4. `src/cli.ts`
5. `src/cli/commands/search-body.ts`
6. `src/capabilities/search-body/spec.ts`
7. `src/capabilities/search-body/contract.ts` and `src/capabilities/search-body/contract/`
8. `src/sources/dart/dsab007/contents/replay-schema.ts`
9. `src/sources/dart/dsab007/contents/replay-contract/`
10. `src/cli/commands/search-body.test.ts`
11. `test/cli/search-body-cli.test.ts`

## Current Scope

- The implemented CLI commands include `search-body` and `view-report`; this prompt focuses on `search-body` tests.
- The CLI is Commander-backed.
- Operation metadata and machine-readable schemas live under `src/capabilities/search-body/` and are reused by the CLI adapter and tests.
- The underlying DART replay core has deterministic schema, serialization, parser, and replay-contract tests under `src/sources/dart/dsab007/contents/`.
- Live DART tests exist separately under `test/live/` and are opt-in.

## What Good CLI Testing Looks Like Here

Add or improve tests in these layers:

1. Parser/help unit tests
- option aliases
- enum validation
- defaults
- required arguments
- help text derived from shared metadata

2. Command execution tests without a subprocess
- invoke the command with an injected runner when possible
- assert that parsed options are forwarded correctly
- assert that CLI options are forwarded as semantic public inputs; DART-shaped replay requests are tested at the source adapter boundary

3. Subprocess smoke tests
- run the real CLI entrypoint
- assert exit code, stdout, and stderr behavior
- keep these few and high-signal

## What To Prefer

- Prefer fast deterministic tests over live network calls.
- Prefer assertions about behavior, not implementation trivia.
- Prefer machine-usable guarantees:
  stdout payload shape, stderr usage, exit codes, validation failures.
- Prefer small local seams over broad refactors if the current code is hard to test.

## What To Avoid

- Do not add browser tests.
- Do not add live DART coverage unless the task explicitly requires it.
- Do not overfit tests to Commander internals if repo-owned metadata or behavior is the real contract.
- Do not rewrite the CLI architecture just to make testing elegant.

## Likely Gaps To Check

Audit whether the current tests cover these cases:

- missing required arguments fail cleanly
- invalid integer options fail cleanly
- stdout stays empty on parse failures
- stderr stays empty on successful `--help`
- successful command execution prints JSON and not extra noise
- root command help and subcommand help both remain usable
- alias pairs stay in sync with the shared operation spec

Only add tests for gaps you confirm are real.

## Deliverable

Make the smallest reviewable change that improves CLI test coverage.

If you need a small production change to enable better tests, keep it narrow and explain why it was necessary.

## Verification

Run:

- `bun run typecheck`
- `bun test`

Do not run `bun run test:live` unless you intentionally changed live coverage.
