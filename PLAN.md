# Public Surface Plan

## Current Status

Darty exposes two supported public surfaces over the same capability core:

- `darty` CLI for humans, subprocess-capable agents, and desktop hosts that need a process boundary.
- `@sjunepark/darty/toolset` for trusted JS/TS server hosts that execute Darty in-process behind their own runtime boundary.

Completed in this pass:

- restored the transport-neutral toolset export without restoring Pi adapters;
- kept the CLI stdout/stderr/exit-code contract intact;
- updated package build and smoke tests so packed consumers can import `@sjunepark/darty/toolset`;
- documented the CLI/toolset/Pi-adapter boundary in README and architecture docs.

## Boundary

- Public CLI: `darty` command help, stdout JSON envelopes, stderr diagnostics, and process exit codes.
- Public toolset: command discovery/help, validation metadata, validated execution, serialized errors, and `AbortSignal` cancellation for trusted JS/TS server hosts.
- Non-goal: Pi, MCP, or runtime-specific package adapters without a separate product decision.

## Follow-ups

- Add a dependency-light package surface validator script if package conformance starts drifting.
