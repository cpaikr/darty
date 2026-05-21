# Ticket: SDK-owned CLI help and validation contract for host adapters

## Goal

Expose enough Darty-owned command help, input validation, and error/repair metadata for host apps such as `creo-web` to present Darty as one CLI-like model-facing tool without redefining Darty command semantics locally.

`creo-web` wants to attach a source-specific tool like:

```text
darty(action, command?, inputJson?)
```

and let the model progressively inspect Darty's own command menu/help before running commands. Darty should remain the source of truth for command names, help copy, schemas, examples, validation messages, recovery hints, result envelopes, references, warnings, and metadata.

## Context

`@sjunepark/darty/toolset` already exposes the key neutral boundary:

```ts
createDartyToolset().listOperations()
createDartyToolset().getOperation(name)
createDartyToolset().execute(name, input, context)
```

That is enough for execution, but downstream hosts still need to derive some repair behavior from JSON schema or wait for execution failures. This encourages host apps to duplicate shallow validation and validation copy.

`creo-web` should not own messages like "companyName is required" for Darty commands. Darty already owns that knowledge.

## Requested design direction

Keep the neutral toolset API runtime-neutral. Do not make `creo-web`, TanStack AI, OpenAI, or Pi the canonical Darty boundary.

Add SDK-owned helpers or fields that support a CLI-like host adapter:

```text
tool help
  -> command menu and source-level guidance

command help
  -> command description, input schema, examples, required keys, limitations

validate/prepare command input
  -> normalized input or Darty-owned typed validation failure

run command
  -> existing execution and result envelope behavior
```

The exact API is open, but it should let host apps avoid reimplementing Darty validation semantics.

## Possible API shape

One possible extension:

```ts
export type DartyCommandHelp = {
  readonly name: DartyOperationName;
  readonly label: string;
  readonly description: string;
  readonly inputJsonSchema: unknown;
  readonly resultJsonSchema: unknown;
  readonly requiredInputKeys: readonly string[];
  readonly examples: readonly Record<string, unknown>[];
  readonly limitations: readonly string[];
};

export type DartyValidationResult =
  | { readonly ok: true; readonly input: Record<string, unknown> }
  | { readonly ok: false; readonly error: DartyValidationFailure };

export type DartyValidationFailure = {
  readonly code: 'missing_parameter' | 'invalid_parameter' | 'unknown_parameter' | 'invalid_request';
  readonly message: string;
  readonly parameter?: string;
  readonly reason?: string;
  readonly expected?: string;
  readonly actual?: unknown;
  readonly recoveryHint?: string;
  readonly exampleInput?: Record<string, unknown>;
};

export type DartyToolset = {
  readonly help: () => DartyToolsetHelp;
  readonly getCommandHelp: (name: string) => DartyCommandHelp | undefined;
  readonly validateInput?: (name: string, input: Record<string, unknown>) => DartyValidationResult;
  readonly execute: (...existing args...) => Promise<unknown>;
};
```

This is illustrative, not mandatory. The important outcome is source-owned validation/help, not these exact type names.

## Requirements

### 1. Source-owned help/menu text

Expose source-level help suitable for a host tool's `help` action:

- what Darty is for;
- command names;
- command labels/descriptions;
- any source-wide limitations or citation guidance.

This should reuse existing Darty copy where possible.

### 2. Source-owned command help

Expose command-level help suitable for a host tool's `command_help` action:

- stable operation name;
- label/title;
- description;
- input JSON schema;
- examples;
- required input keys if cheaply available;
- known limitations or follow-up guidance;
- result shape summary if available.

This should come from Darty's schemas/copy, not downstream parsing heuristics.

### 3. Validation without source lookup

Provide a way to validate or prepare command input without hitting DART network sources.

The validation result should preserve Darty-owned messages and structured fields such as:

- code;
- parameter;
- reason;
- expected;
- actual;
- message;
- recovery hint;
- example input, if available.

This lets host apps return model-repair feedback without duplicating Darty's validator.

### 4. Structural error serialization guidance

Document or export a helper for serializing Darty errors structurally across host/bundler boundaries.

Host apps should be able to preserve fields from Darty failures even when `instanceof` is unreliable:

- `code`
- `retryable`
- `parameter`
- `sourceUrl`
- `recoveryHint`
- `operationName`
- `message`

### 5. Preserve existing behavior

Do not remove or degrade:

- `darty` CLI;
- `@sjunepark/darty/toolset` execution;
- `@sjunepark/darty/pi` adapter;
- result references, warnings, metadata, and raw result envelopes.

## Non-goals

- Do not build a `creo-web`-specific adapter inside Darty.
- Do not expose one eager OpenAI/TanStack tool per Darty operation as the canonical boundary.
- Do not make Pi the canonical Darty integration layer.
- Do not require live DART access for validation tests.

## Acceptance criteria

- A host can render Darty source-level help without hardcoding command descriptions.
- A host can render one command's help/schema/examples without parsing Darty internals.
- A host can validate malformed command input and receive Darty-owned validation messages without executing a DART source lookup.
- A host can serialize Darty execution/validation failures while preserving structured fields and recovery hints.
- Existing tests pass:

```bash
bun run typecheck
bun test
bun run build
```
