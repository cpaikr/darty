# CLI-Only Surface Plan

## Current Status

Darty's public integration surface is the CLI. The package publishes the `darty` bin and does not export TypeScript toolset or Pi adapter subpaths.

Completed in this pass:

- narrowed `package.json` to CLI packaging only;
- changed the build to emit only `dist/cli.js`;
- updated package smoke tests to reject `@sjunepark/darty/toolset` and `@sjunepark/darty/pi` imports;
- removed Pi and typed-agent eval scripts from the documented package commands;
- deleted the inactive toolset, Pi adapter, agent-tool definitions, and matching non-CLI eval scaffolding;
- updated README, architecture, release, spec, and eval docs to point agents at the CLI subprocess contract.

## Boundary

- Public: `darty` CLI, command help, stdout JSON envelopes, stderr diagnostics, and process exit codes.
- Internal: capability contracts, app wiring, source adapters, and parser/provider tests.
- Future adapters: only after the CLI contract is stable and a concrete host need justifies the new surface.

## Follow-ups

- Add a dependency-light CLI surface validator script if package conformance starts drifting.
