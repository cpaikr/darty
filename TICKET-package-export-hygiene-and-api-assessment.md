# Ticket: Assess package export hygiene and toolset API hardening

## Goal

Review and improve the `@sjunepark/darty@0.0.8` reusable package surfaces before treating `@sjunepark/darty/toolset` and `@sjunepark/darty/pi` as stable integration boundaries.

This ticket is mostly about package/API hygiene. It is **not** a request for Darty to build a `creo-web` adapter. `creo-web` should consume the neutral `@sjunepark/darty/toolset` export and own its own app-specific adapter.

## Context

Version `0.0.8` successfully added the intended surfaces:

- CLI binary: `darty`
- neutral toolset export: `@sjunepark/darty/toolset`
- Pi adapter export: `@sjunepark/darty/pi`
- Pi extension manifest entry: `dist/pi-extension.js`

The overall design direction looks good:

- Darty owns canonical operation names, schemas, execution, result envelopes, references, warnings, metadata, and typed failures.
- Host adapters should wrap the neutral toolset instead of duplicating operation definitions.
- Pi uses a progressive adapter shape rather than one eager Pi tool per Darty operation.

However, the published package appears to independently bundle each library subpath, which creates unnecessary package weight and may create cross-subpath class identity problems.

## Primary issue to assess/fix

### Avoid independently bundled library subpaths

The npm package currently includes large duplicated bundles for each importable subpath:

```text
dist/toolset.js       ~3.39 MB
dist/pi.js            ~3.40 MB
dist/pi-extension.js  ~3.40 MB
```

This is acceptable for the CLI, but weaker for library exports. Because `pi.js` appears to bundle its own copy of `toolset.ts`, class identity can diverge between imports:

```ts
import { createDartyToolset, DartyToolsetError } from "@sjunepark/darty/toolset";
import { createDartyPiTools } from "@sjunepark/darty/pi";

const toolset = createDartyToolset();
const run = createDartyPiTools({ toolset, includeHelpTool: false }).find(
  (tool) => tool.name === "darty_run_operation",
);

const result = await run?.execute("call-1", { name: "bad-operation", input: {} });
```

If the error was created by the separately imported `toolset.js`, but `pi.js` checks against its own bundled `DartyToolsetError`, `instanceof DartyToolsetError` may fail. In a smoke test, this caused serialized Pi error details to lose `operationName`.

Suggested direction:

- Keep `dist/cli.js` bundled and executable.
- Emit library subpaths as shared ESM modules rather than independent full bundles.
- Make `dist/pi.js` import from `./toolset.js`.
- Make `dist/pi-extension.js` import from `./pi.js`.
- Keep `.d.ts` files aligned with those shared ESM imports.
- Add a package-level smoke test that installs/packs the package and verifies cross-subpath behavior.

Acceptance checks for this issue:

```ts
import { createDartyToolset, DartyToolsetError } from "@sjunepark/darty/toolset";
import { createDartyPiTools } from "@sjunepark/darty/pi";

const toolset = createDartyToolset();

try {
  await toolset.execute("not-a-darty-operation", {});
} catch (error) {
  assert(error instanceof DartyToolsetError);
}

const run = createDartyPiTools({ toolset, includeHelpTool: false }).find(
  (tool) => tool.name === "darty_run_operation",
);

const result = await run!.execute("call-1", {
  name: "not-a-darty-operation",
  input: {},
});

assert.equal(result.details.error.operationName, "not-a-darty-operation");
```

## Secondary improvement to assess/fix

### Make Pi error serialization structural

Even with shared ESM output, the Pi adapter should not rely only on `instanceof DartyToolsetError` when serializing errors.

Package duplication, bundlers, test doubles, or host boundaries can all produce error-like objects that are structurally equivalent but fail `instanceof`.

Suggested direction:

- Keep the `instanceof DartyToolsetError` path if useful.
- Also copy known structural fields from any `Error & Record<string, unknown>`:
  - `code`
  - `retryable`
  - `operationName`
  - `parameter`
  - `sourceUrl`
  - `recoveryHint`
- Add a regression test using a custom toolset passed into `createDartyPiTools()` that throws an error-like object with `operationName` and verifies the field is preserved.

## Worth considering / assessment requested

Please assess these suggestions before implementing. They may not all be worth doing immediately.

### 1. Pi conformance/type testing

The current Pi adapter intentionally avoids importing Pi runtime types, which keeps Darty lightweight and avoids tighter coupling. That is a reasonable choice.

Still, Darty should assess whether to add a dev-only conformance check against Pi's actual tool definition shape, for example:

- type-only/dev-only import from `@earendil-works/pi-coding-agent`, or
- a small test fixture that verifies the generated tools are assignable to Pi's `ToolDefinition` shape, or
- a documented decision to stay structurally typed and not compile-test against Pi.

Tradeoff:

- Pro: catches Pi API drift earlier.
- Con: adds maintenance/dependency coupling to an optional adapter.

Recommended action: assess and either add a dev-only check or document why structural typing is enough for now.

### 2. Stronger TypeScript operation typing for the neutral toolset

The current neutral API is agent-host friendly:

```ts
execute(name: string, input: Record<string, unknown>): Promise<unknown>
```

That is acceptable for progressive/discovery-based agents, but less helpful for TypeScript consumers that know the operation at compile time.

Please assess whether Darty should later expose operation input/result maps or typed overloads, such as:

```ts
type DartyOperationInputMap = {
  "search-company": SearchCompanyInput;
  "view-report": ViewReportInput;
  // ...
};

type DartyOperationResultMap = {
  "search-company": SearchCompanyResultEnvelope;
  "view-report": ViewReportResultEnvelope;
  // ...
};

execute<Name extends DartyOperationName>(
  name: Name,
  input: DartyOperationInputMap[Name],
  context?: DartyToolRunContext,
): Promise<DartyOperationResultMap[Name]>;
```

Tradeoff:

- Pro: better SDK ergonomics and compile-time guarantees for TypeScript hosts.
- Con: requires exporting and maintaining more public types.

Recommended action: defer unless a TypeScript host needs it soon, but document whether this is planned for the stable API.

### 3. Public contract stability policy

Please assess whether the README or docs should explicitly state stability expectations for:

- canonical operation names;
- input JSON schemas;
- result envelope top-level fields;
- warning/error code semantics;
- SemVer treatment for schema/name changes.

Recommended action: add a short policy if these package exports are intended to be reused by other repos.

## Non-goals

- Do not build a `creo-web` adapter in Darty.
- Do not make Pi the canonical Darty boundary.
- Do not remove or weaken the CLI.
- Do not expose one Pi tool per Darty operation unless eval evidence shows the progressive shape is inadequate.
- Do not duplicate operation definitions in downstream repos.

## Suggested validation

Run the normal checks:

```bash
bun run typecheck
bun test
bun run build
```

Also add a package-level smoke test that uses the packed or installed package rather than only source imports. It should verify:

- `@sjunepark/darty/toolset` imports successfully;
- `@sjunepark/darty/pi` imports successfully;
- the `darty` binary still runs;
- `pi` tools created with a separately imported toolset preserve structured error fields across subpaths.
