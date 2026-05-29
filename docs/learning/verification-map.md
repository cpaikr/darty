# Verification Map

`darty` uses several verification layers because different risks need different checks. This page explains what each layer is for.

## Verification Layers

```text
module tests
   |
   v
transport and subprocess tests
   |
   v
opt-in live DART tests
   |
   v
scenario and agent tool-use evals
```

Each layer should answer a different question. Avoid moving every check into the highest or most expensive layer.

## Colocated Module Tests

Colocated `*.test.ts` files prove deterministic code behavior close to the module being tested.

Examples:

- `src/capabilities/search-body/contract.test.ts`
  validates request resolution, defaults, unknown parameter rejection, and public validation behavior.
- `src/capabilities/search-body/spec.test.ts`
  ensures JSON Schemas come from the shared core schemas.
- `src/capabilities/search-body/execute.test.ts`
  checks provider error normalization and result construction.
- `src/cli/commands/search-body.test.ts`
  checks CLI parsing and delegation without turning the CLI into the validation owner.
- `src/sources/dart/dsab007/contents/parse-html.test.ts`
  checks parser behavior against fixture HTML.
- `src/sources/dart/dsab007/contents/search.test.ts`
  checks source-to-provider mapping.

Use these when the expected behavior can be proven without hitting live DART or an LLM.

## Broader Tests Under `test/`

`test/cli/` contains subprocess CLI checks. These verify that the packaged command path behaves as a user would see it, including stdout JSON behavior.

`test/live/` contains opt-in live DART checks. These are for source behavior that fixtures cannot prove, such as whether DART still accepts the replay request and returns parseable results.

Run live tests only when you intentionally want upstream coverage:

```bash
bun run test:live
```

## Evals Under `evals/`

Evals are capability-scoped and currently focus on `search-body`.

The main tracks are:

- fixed-command CLI scenario evals
- agentic CLI invocation evals

These do not replace deterministic tests. They answer model/tool-use questions such as:

- can a fixed live scenario return the expected structured envelope?
- can a model use the provided local CLI runner with valid arguments?

Non-CLI eval tracks remain out of scope; the trusted-host toolset is covered by deterministic and package smoke tests rather than agent eval tracks.

## What To Run While Working

For normal implementation changes:

```bash
bun run typecheck
bun test
```

For live source confidence:

```bash
bun run test:live
```

For eval tracks:

```bash
bun run eval:search-body:cli
bun run env:check
bun run eval:search-body:agent:cli
```

Agentic evals require `OPENAI_API_KEY` in `.env.local`.

## Boundary Rules

- Parser correctness belongs in parser tests and live source checks, not LLM evals.
- CLI command shape belongs in CLI command tests.
- CLI subprocess behavior belongs in `test/cli/`.
- Fixed live scenario usefulness can live in `evals/`.
- Final user-facing answer quality should be a separate future eval track if needed.

For the canonical eval policy, defer to [evals/README.md](../../evals/README.md) and [evals/search-body/README.md](../../evals/search-body/README.md).
