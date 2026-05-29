# Restore the Darty toolset export for trusted server hosts

## Background

Darty was recently narrowed to a CLI-only public package surface. That direction fits local desktop products such as Creo, where tools need to run behind a subprocess policy boundary. It is a worse fit for trusted server hosts such as `creo-web`, which already run Darty on the server and benefit from an in-process, transport-neutral toolset contract.

The desired shape is not to restore Pi-specific adapters. The desired shape is:

```text
Darty capability core
  -> darty CLI                 for humans, subprocess hosts, and Creo desktop
  -> @sjunepark/darty/toolset  for trusted JS/TS server hosts
```

## Use git history first

Past versions already had most of the needed code and documentation. Before rewriting, inspect and reuse the earlier implementation and docs where they still fit.

Useful starting points:

```sh
git log --oneline --all -- package.json src/toolset.ts src/toolset.test.ts README.md ARCHITECTURE.md docs evals

git show 6673fff -- package.json src/toolset.ts src/toolset.test.ts README.md
# feat: add reusable toolset and Pi adapter

git show 68194e9 -- src/toolset.ts src/toolset.test.ts README.md ARCHITECTURE.md
# feat: add SDK-owned toolset help and validation

git show 40096bd -- src/toolset.ts src/toolset.test.ts
# feat: add validation recovery metadata to toolset

git show c341315 -- package.json README.md ARCHITECTURE.md src/toolset.ts src/toolset.test.ts
# refactor: remove non-CLI tool surfaces; useful as the revert boundary
```

Use targeted restoration rather than a blind revert if the current CLI-only cleanup also contains docs or packaging improvements worth keeping.

## Scope

- Reintroduce a supported `@sjunepark/darty/toolset` package export.
- Keep the `darty` CLI and its stdout/stderr/exit-code contract intact.
- Do **not** restore `@sjunepark/darty/pi`, Pi extension metadata, or Pi-specific docs unless a separate product decision asks for it.
- Keep the toolset contract transport-neutral and server-friendly.
- Update README and architecture docs to say:
  - CLI is the recommended surface for humans, agents that run subprocesses, and Creo desktop.
  - `@sjunepark/darty/toolset` is supported for trusted JS/TS host applications that execute Darty in-process on their own server/runtime boundary.
  - Pi adapters are intentionally not part of the package surface.

## Expected toolset contract

Restore or adapt the previous contract around this shape:

```ts
createDartyToolset(): {
  help(): ToolsetHelp;
  getCommandHelp(command: string): CommandHelp | undefined;
  validateInput(command: string, input: unknown): ValidationResult;
  execute(
    command: string,
    input: Record<string, unknown>,
    context?: { signal?: AbortSignal }
  ): Promise<unknown>;
  serializeError(error: unknown): DartySerializedError;
}
```

The exact names may follow the previous implementation, but the important properties are:

- structured command discovery;
- structured per-command help, schemas, examples, limitations, and result summaries;
- source-owned validation and recovery metadata;
- source-owned serialized errors;
- `AbortSignal` support for trusted host cancellation;
- no dependency on Pi runtime types.

## Acceptance criteria

- `package.json` exports `./toolset` with ESM and types.
- `npm pack` includes the built toolset files and type declarations, not only `dist/cli.js`.
- Existing CLI package smoke tests still pass.
- New or restored package smoke tests prove a consumer can import `@sjunepark/darty/toolset` from the packed package.
- Unit tests cover toolset help, command help, validation failure metadata, execution, and serialized errors.
- README and architecture docs clearly distinguish CLI, toolset, and non-goal Pi adapter surfaces.
- `creo-web` can continue using `@sjunepark/darty/toolset` without adopting Darty Pi tool definitions or a subprocess wrapper.
