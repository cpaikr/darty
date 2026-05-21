# Ticket: Single PI SDK tool contract for Darty

## Goal

Expose Darty to PI and PI-based hosts as one first-class tool named `darty`, not as multiple progressive tools.

Creo wants to attach Darty to a workflow node by importing the tool from `@sjunepark/darty/pi` and passing it directly to PI SDK `createAgentSession({ customTools, tools })` without Creo-side wrappers, type casts, or adapter code.

The model-facing shape should be:

```text
darty(action, command?, inputJson?)
```

Darty should remain the source of truth for command names, help text, schemas, examples, validation messages, recovery hints, execution result envelopes, references, warnings, and metadata.

## Context

The neutral SDK/toolset contract already has the right underlying concepts:

```ts
createDartyToolset().help()
createDartyToolset().listOperations()
createDartyToolset().getCommandHelp(name)
createDartyToolset().validateInput(name, input)
createDartyToolset().execute(name, input, context)
createDartyToolset().serializeError(error)
```

However, the current PI adapter exposes four tools:

```text
darty_list_operations
darty_get_operation_details
darty_run_operation
darty_get_help
```

That is not the desired PI-facing contract. The previous ticket, [`TICKET-sdk-owned-cli-help-and-validation-contract.md`](./TICKET-sdk-owned-cli-help-and-validation-contract.md), describes a CLI-like host adapter with one source-specific tool. This ticket applies that idea specifically to the PI SDK adapter.

## Requirements

### 1. Export one PI-compatible tool

`@sjunepark/darty/pi` should export a factory for one tool:

```ts
import { createDartyPiTool } from '@sjunepark/darty/pi';

const dartyTool = createDartyPiTool();
```

The returned value must be directly usable as a PI SDK custom tool:

```ts
await createAgentSession({
  customTools: [dartyTool],
  tools: ['darty']
});
```

No host-side wrapper should be required.

The package PI extension should register only this one tool by default:

```ts
export default function dartyPiExtension(pi) {
  pi.registerTool(createDartyPiTool());
}
```

### 2. Use the actual PI tool shape, not a near-miss structural shape

The exported tool should be TypeScript-compatible with PI's `ToolDefinition` / `defineTool` contract.

At minimum, avoid the current assignability issue where `readonly string[]` prompt guidelines are not assignable to PI's mutable `string[]` field.

The implementation can choose the exact dependency strategy, but the public result should be usable by TypeScript hosts without casts. Options include:

- use `defineTool()` and PI/TypeBox types directly; or
- keep a structural implementation but make the exported `.d.ts` assignable to PI's tool type.

The schema should be PI-provider compatible. Use TypeBox-compatible schemas and PI's recommended enum shape when needed.

### 3. Tool name and parameters

The tool name should be exactly:

```text
darty
```

Suggested actions:

- `help` — return Darty source-level help and the command menu.
- `command_help` — return one command's description, schema, examples, limitations, and result summary.
- `validate` — validate and normalize one command input without a DART network lookup.
- `run` — validate, then execute one command.

Suggested parameters:

```ts
{
  action: 'help' | 'command_help' | 'validate' | 'run';
  command?: string;
  inputJson?: Record<string, unknown>;
}
```

Validation rules:

- `help` requires only `action`.
- `command_help` requires `command`.
- `validate` requires `command` and `inputJson`.
- `run` requires `command` and `inputJson`.

Use canonical Darty operation names as the command names.

### 4. Model-facing content must be useful

PI sends tool `content` back to the model. `details` are valuable for UI, inspection, persistence, and host diagnostics, but the model must not need host-specific access to `details` to continue the task.

Each action should return content that is compact but sufficient:

- `help`: available commands, source-wide limitations, citation guidance.
- `command_help`: required keys, input schema summary or JSON schema, examples, limitations.
- `validate`: normalized input on success or Darty-owned validation failure fields on failure.
- `run`: enough result data, references, warnings, and source/citation fields for the model to answer or decide the next command.

Preserve the full structured result in `details`.

### 5. Darty-owned validation and repair feedback

The PI tool must call Darty's own validation before execution for `validate` and `run`.

For invalid command input, return Darty-owned structured feedback rather than letting hosts infer validation from schemas. Preserve fields such as:

- `code`
- `parameter`
- `reason`
- `expected`
- `actual`
- `message`
- `recoveryHint`
- `exampleInput`

This feedback should appear in both model-facing `content` and structured `details`.

### 6. Error and abort behavior

Pass PI's `AbortSignal` through to the toolset execution path.

Execution failures should preserve Darty's structural error fields via `serializeDartyError` / `toolset.serializeError`:

- `code`
- `retryable`
- `parameter`
- `sourceUrl`
- `recoveryHint`
- `operationName`
- `message`

For model-repairable failures, prefer returning a structured failed tool result instead of throwing away Darty's repair metadata. Throw only for adapter defects or unrecoverable implementation errors where PI should mark the tool call itself as failed.

### 7. Backward compatibility and migration

Decide whether the existing four progressive tools should be removed, deprecated, or moved behind an explicit legacy factory such as `createDartyProgressivePiTools()`.

Default behavior should not expose four separate tools. Package install via:

```bash
pi install npm:@sjunepark/darty
```

should make only the `darty` tool available.

### 8. Reusable beyond Creo

Do not make this a Creo-specific adapter.

The tool should work for:

- PI CLI users who install Darty as a PI package.
- Node/TypeScript apps that embed PI through `createAgentSession()`.
- Other PI-based desktop, web, eval, or automation hosts that want one DART source tool.

Keep host policy outside Darty. Hosts such as Creo may decide when a node has the `darty` tool attached, but Darty should own the tool contract and DART semantics.

## Acceptance Criteria

- `@sjunepark/darty/pi` exports `createDartyPiTool()`.
- `createDartyPiTool()` returns one tool named `darty`.
- The returned value is assignable to PI's `ToolDefinition` type without casts in a consumer TypeScript project.
- The returned value can be passed directly to PI SDK `createAgentSession({ customTools: [tool], tools: ['darty'] })`.
- The package PI extension registers only the single `darty` tool by default.
- `darty({ action: 'help' })` returns source-level help and command names in model-facing content.
- `darty({ action: 'command_help', command })` returns Darty-owned command help, schema, examples, limitations, and result summary.
- `darty({ action: 'validate', command, inputJson })` returns normalized input or Darty-owned validation failure fields without live DART access.
- `darty({ action: 'run', command, inputJson })` validates before execution, passes through abort signals, returns useful model-facing content, and preserves the full result envelope in details.
- Existing CLI and neutral `@sjunepark/darty/toolset` behavior remain intact.
- Tests cover package exports, PI tool shape, single-tool registration, validation failure details, abort propagation, and no-live-network help/validation behavior.

Suggested checks:

```bash
bun run typecheck
bun test
bun run build
```
