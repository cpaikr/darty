# TICKET: Add SDK-owned validation recovery policy to Darty toolset

## Context

`@sjunepark/darty@0.0.10` now exposes the host-facing toolset boundary needed by `creo-web`:

- `help()`
- `getCommandHelp(name)`
- `validateInput(name, input)`
- `serializeError(error)`
- `execute(name, input, context?)`

This lets hosts use Darty-owned command help, examples, limitations, schemas, validation messages, and serialized execution errors instead of recreating Darty command semantics locally.

One policy detail is still host-owned today: `DartyValidationFailure` does not tell a host whether the validation failure is retryable or what recovery action should be suggested to an LLM/tool runner.

Current type:

```ts
export type DartyValidationFailure = {
  readonly code: DartyValidationFailureCode;
  readonly message: string;
  readonly operationName?: string;
  readonly parameter?: string;
  readonly reason?: string;
  readonly expected?: string;
  readonly actual?: unknown;
  readonly recoveryHint?: string;
  readonly exampleInput?: Record<string, unknown>;
};
```

Because `retryable` is absent, `creo-web` still adds wrapper-level retry behavior for Darty validation failures, e.g. “retryable: true” and “nextAction: command_help”. That is acceptable as a temporary host policy, but Darty should own it so all hosts behave consistently.

## Goal

Make validation recovery policy SDK-owned for the `@sjunepark/darty/toolset` API.

A host should be able to call:

```ts
const result = toolset.validateInput("search-company", input);
```

and, when invalid, receive enough structured information to decide whether an LLM/tool runner should retry and what it should inspect or fix next without deriving that policy from JSON Schema or hard-coded host rules.

## Proposed API shape

Extend `DartyValidationFailure` with explicit recovery policy:

```ts
export type DartyValidationRecoveryAction =
  | {
      readonly kind: "inspect_command_help";
      readonly operationName: DartyOperationName;
    }
  | {
      readonly kind: "retry_with_input";
      readonly operationName: DartyOperationName;
      readonly inputPatch?: Record<string, unknown>;
    }
  | {
      readonly kind: "inspect_tool_help";
    };

export type DartyValidationFailure = {
  readonly code: DartyValidationFailureCode;
  readonly message: string;
  readonly operationName?: string;
  readonly parameter?: string;
  readonly reason?: string;
  readonly expected?: string;
  readonly actual?: unknown;
  readonly recoveryHint?: string;
  readonly exampleInput?: Record<string, unknown>;
  readonly retryable: boolean;
  readonly recoveryAction?: DartyValidationRecoveryAction;
};
```

Naming is flexible. Prefer clear SDK-owned semantics over matching `creo-web` names exactly. Avoid leaking `creo-web` actions such as `command_help` into Darty if a more general `inspect_command_help` term is clearer.

## Suggested behavior

Initial policy can be conservative:

- missing required parameter:
  - `retryable: true`
  - `recoveryAction.kind: "inspect_command_help"`
  - include `parameter`, `expected`, and `exampleInput` when available
- invalid parameter value/type:
  - `retryable: true`
  - `recoveryAction.kind: "inspect_command_help"` or `"retry_with_input"` if Darty can suggest a safe patch
- unknown parameter:
  - `retryable: true`
  - `recoveryAction.kind: "inspect_command_help"`
- unknown operation passed to `validateInput`:
  - `retryable: true`
  - `recoveryAction.kind: "inspect_tool_help"`
- structurally invalid/non-object input:
  - `retryable: true`
  - `recoveryAction.kind: "inspect_command_help"`

If a future validation failure is not recoverable by changing tool input, set `retryable: false` and omit `recoveryAction` or provide a non-retry recovery kind.

## Non-goals

- Do not add a generic agent framework.
- Do not add provider-specific names such as OpenAI, TanStack, or `creo-web` to the public Darty contract.
- Do not move app-owned wrapper concerns into Darty. Hosts still own malformed JSON strings, skipped command-inspection guards, UI activity events, persistence, and provider tool-loop mechanics.
- Do not change command execution behavior unless needed to keep validation and execution error contracts consistent.

## Acceptance criteria

- `DartyValidationFailure` includes explicit `retryable` metadata.
- Validation failures produced by `validateInput()` include a source-owned recovery policy where useful.
- Existing validation messages remain Darty-owned and are not weakened.
- `serializeError()` behavior remains compatible with existing execution errors.
- Tests cover at least:
  - missing `search-company.companyName`;
  - invalid/non-object command input;
  - unknown operation in `validateInput()`;
  - one invalid enum/filter-style input if a capability has one.
- README or toolset docs mention that hosts should use `validateInput()` recovery metadata instead of deriving retry policy from JSON Schema.

## Why this helps hosts

`creo-web` can reduce its Darty-specific wrapper policy to a pass-through mapping:

```ts
retryable: error.retryable,
recoveryAction: error.recoveryAction,
details: error
```

The app would still own wrapper errors such as malformed `inputJson`, missing `command`, unknown local source tool, and skipped `command_help`, but Darty would fully own Darty command validation semantics and recovery policy.
