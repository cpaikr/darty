# Add structured validation recovery metadata to the Darty toolset

## Background

`@sjunepark/darty/toolset` is restored for trusted JS/TS server hosts. It currently exposes structured command discovery, command help, validation, execution, and serialized errors, but the restored validation failure type no longer carries the machine-readable recovery metadata that host apps need to recover without parsing prose.

Use the installed Open Creo `tool-surface-spec` skill before implementing this ticket. Apply its neutral toolset guidance rather than inventing a Darty-only shape.

## Current gap

`DartyValidationFailure` currently includes fields such as `code`, `message`, `operationName`, `parameter`, `reason`, `expected`, `actual`, `recoveryHint`, and `exampleInput`.

It should also expose machine-readable recovery metadata and explicit input-repair recoverability:

```ts
type DartyValidationRecoveryAction =
  | { readonly kind: "inspect_tool_help" }
  | { readonly kind: "inspect_command_help"; readonly operationName: DartyOperationName };

type DartyValidationFailure = {
  readonly recoveryAction: DartyValidationRecoveryAction;
  readonly recoverable: true;
};
```

Validation failures should not expose `retryable`. Reserve `retryable` for execution or source failures where the same unrepaired request might succeed later.

Darty had a related recovery action shape in earlier toolset history. Inspect it before changing the current implementation:

```sh
git show 40096bd -- src/toolset.ts src/toolset.test.ts
```

## Scope

- Add structured validation recovery metadata to `src/toolset.ts` validation failures.
- Preserve the human-readable `recoveryHint` field.
- Add `recoverable: true` for validation failures that callers can repair by following the recovery metadata.
- Do not expose `retryable` on validation failures. Reserve `retryable` for execution or source failures where the same input might succeed later.
- Ensure unknown operations point callers to tool-level help.
- Ensure invalid or missing command input points callers to command-level help for the selected operation.
- Keep the toolset transport-neutral and independent of Pi runtime types.
- Keep CLI behavior intact unless the CLI JSON failure envelope already mirrors toolset validation metadata and should be extended consistently.

## Suggested mapping

- Unknown operation:
  - `recoverable: true`
  - `recoveryAction: { kind: "inspect_tool_help" }`
  - no `retryable`
  - `recoveryHint`: tells the caller to inspect `help()` or `listOperations()`.
- Non-object operation input:
  - `recoverable: true`
  - `recoveryAction: { kind: "inspect_command_help", operationName }`
  - no `retryable`
  - include `expected` and an `exampleInput` when available.
- Missing/invalid/unknown parameter:
  - `recoverable: true`
  - `recoveryAction: { kind: "inspect_command_help", operationName }`
  - no `retryable`
  - include `parameter`, `reason`, `expected`, `actual` when safe, and `exampleInput` when available.

## Acceptance criteria

- `validateInput()` failures include machine-readable recovery metadata for unknown operation, non-object input, missing required parameter, invalid parameter, and unknown parameter cases.
- `validateInput()` failures use input-repair `recoverable` metadata and do not expose same-input-later `retryable` metadata.
- Tests cover the recovery action shape, `recoverable`, and human `recoveryHint` for representative failures.
- `serializeError()` preserves recovery-related fields from validation/toolset errors where applicable.
- Package declarations expose the recovery metadata and recoverability types.
- `bun run typecheck` and `bun test` pass.
- `creo-web` can consume `@sjunepark/darty/toolset` validation failures without recreating Darty-specific recovery logic.
