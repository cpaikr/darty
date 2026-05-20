# Ticket: Export reusable Darty toolset and Pi progressive adapter

## Goal

Make `@sjunepark/darty` usable as both the existing CLI app and a reusable tool provider for other agent hosts.

The package should continue to expose the `darty` CLI, but also export a stable runtime-neutral toolset primitive and a Pi extension/adapter that exposes Darty through a progressive discovery/execution shape.

## Why

`creo-web` and future projects should not redefine Darty operations, schemas, prompts, or CLI flag wrappers locally. Darty should own its capability catalog, input schemas, execution path, result envelopes, warnings, references, and source limitations.

Agent hosts should adapt Darty's neutral toolset contract into their own tool APIs:

```text
@sjunepark/darty/toolset
  canonical Darty toolset, operations, schemas, execution

@sjunepark/darty/pi
  Pi adapter over the canonical toolset

creo-web or other hosts
  import the canonical toolset or a host-specific adapter
```

## Preferred package shape

Keep this in the same npm package rather than a separate package for now.

Example `package.json` direction:

```jsonc
{
  "name": "@sjunepark/darty",
  "bin": {
    "darty": "dist/cli.js"
  },
  "exports": {
    "./toolset": {
      "types": "./dist/toolset.d.ts",
      "import": "./dist/toolset.js"
    },
    "./pi": {
      "types": "./dist/pi.d.ts",
      "import": "./dist/pi.js"
    }
  },
  "pi": {
    "extensions": ["./dist/pi-extension.js"]
  }
}
```

Exact dist filenames can differ, but exported subpaths should be stable and documented.

## Design requirements

### 1. Canonical neutral toolset export

Add a stable subpath such as:

```ts
import { createDartyToolset } from '@sjunepark/darty/toolset';
```

The exported contract should be runtime-neutral and not depend on Pi, TanStack AI, OpenAI, or creo-web.

Conceptual shape:

```ts
export type DartyToolset = {
  readonly id: 'darty';
  readonly label: string;
  readonly description: string;
  readonly listOperations: () => readonly DartyOperationSummary[];
  readonly getOperation: (name: string) => DartyOperationSpec | undefined;
  readonly execute: (
    name: string,
    input: Record<string, unknown>,
    context?: DartyToolRunContext
  ) => Promise<DartyToolRunResult>;
};

export type DartyToolRunContext = {
  readonly signal?: AbortSignal;
};
```

The actual type names may differ, but the boundary should support:

- operation discovery;
- operation detail lookup;
- JSON-schema input contract exposure;
- execution by stable operation name;
- abort/cancellation where practical;
- preserving the existing capability result envelope, references, warnings, and metadata.

Use operation names like the current capability names:

- `search-body`
- `search-company`
- `search-company-reports`
- `company-detail`
- `company-rss`
- `disclosure-types`
- `view-report`

Do not make OpenAI-style names such as `darty_search_company` the canonical operation IDs.

### 2. Progressive Pi adapter

Expose Darty to Pi using a progressive shape rather than one Pi tool per Darty operation.

Preferred Pi-facing tools:

```text
darty_list_operations
darty_get_operation_details
darty_run_operation
```

Optionally include a toolset-level help tool if it materially improves model behavior:

```text
darty_get_help
```

The Pi adapter should wrap `createDartyToolset()` and register tools with `pi.registerTool()` or export standalone `defineTool()` definitions.

Conceptual API options:

```ts
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export function registerDartyPiTools(pi: ExtensionAPI): void;
```

and/or a Pi package extension entry:

```ts
export default function dartyPiExtension(pi: ExtensionAPI) {
  registerDartyPiTools(pi);
}
```

Pi tool requirements:

- use TypeBox-compatible parameter schemas;
- include clear `promptSnippet` and `promptGuidelines` that name the specific Pi tool;
- pass Pi's `signal` into Darty execution;
- return concise model-facing text plus structured `details` for rendering/debugging;
- preserve DART source identifiers, source URLs/references, warnings, metadata, and typed errors;
- avoid raw HTML or huge raw result dumps in normal text output.

### 3. Build and publishing support

The package currently builds a Node-compatible CLI bundle. Extend the build so npm publishes:

- CLI entrypoint still working as `darty`;
- importable ESM files for `@sjunepark/darty/toolset`;
- importable ESM files for `@sjunepark/darty/pi`;
- `.d.ts` files for stable exports.

Keep runtime dependencies needed by the Pi adapter in the right place:

- Pi core packages should be `peerDependencies` with `"*"` if imported by the adapter, following Pi package guidance.
- Runtime dependencies that are not bundled by Pi must be available after npm install.

### 4. Documentation

Update Darty docs to explain the three surfaces:

```text
CLI
  darty search-company ...

Neutral package API
  import { createDartyToolset } from '@sjunepark/darty/toolset'

Pi package/extension
  pi install npm:@sjunepark/darty
```

Docs should make clear that CLI remains supported, but the neutral toolset is the canonical integration surface for agent hosts.

### 5. Tests

Add focused tests for:

- `createDartyToolset().listOperations()` exposes the expected stable operation names;
- `getOperation()` returns operation details including input JSON schema and concise descriptions;
- `execute()` delegates to the existing capability executors and preserves result envelope fields;
- unknown operation returns/throws a typed error rather than an unstructured failure;
- Pi adapter registers the progressive tools with expected names and schemas.

Do not require live DART access for default tests. Keep live/source checks opt-in as they are today.

## Non-goals

- Do not remove or degrade the existing CLI.
- Do not make Pi the canonical Darty capability boundary.
- Do not add a marketplace/plugin framework.
- Do not expose every Darty operation as an eager Pi tool unless later evals prove the progressive shape underperforms.
- Do not duplicate Darty capability schemas in downstream repos like `creo-web`.

## Acceptance criteria

- `darty` CLI still works after build.
- Another TypeScript repo can import `@sjunepark/darty/toolset` and execute a Darty operation without shelling out.
- Pi can load the package as an extension and receives progressive Darty tools.
- The progressive Pi tools can list operations, inspect operation details, and run one operation.
- Existing Darty result references, warnings, limitations, and typed errors remain available to callers.
- Default typecheck and tests pass:

```bash
bun run typecheck
bun test
bun run build
```

## Follow-up use in creo-web

After this lands, `creo-web` should import the neutral toolset instead of defining Darty operation metadata locally or writing operation-specific CLI wrappers.

`creo-web` can then adapt the Darty toolset into its own TanStack AI progressive tools:

```text
list_toolsets
get_toolset_help
get_operation_details
run_operation
```

This keeps Darty reusable across Pi, web chat, and future agent hosts.
