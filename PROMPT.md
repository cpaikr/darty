# Prompt: Add Missing CLI Tests

You are working in `darty`. Your job is to audit the current CLI test coverage and add the missing tests for the current CLI surface.

Do not broaden product scope. Do not add new user-facing features unless a missing test requires a small, local testability seam.

## Goal

Strengthen test coverage for the current `contents-search` CLI so it behaves like a reliable tool for agents and LLMs.

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
5. `src/cli/commands/contents-search.ts`
6. `src/tools/operations/contents-search.ts`
7. `src/dart/dsab007/contracts.ts`
8. `src/cli/commands/contents-search.test.ts`
9. `test/cli/contents-search-cli.test.ts`

## Current Scope

- The only implemented CLI command is `contents-search`.
- The CLI is Commander-backed.
- Operation metadata is transport-agnostic and lives under `src/tools/operations/`.
- The underlying DART replay core already has deterministic contract and parser tests.
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
- assert that DART-shaped request inputs are built correctly from CLI options

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
