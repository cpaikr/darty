# Roadmap

## Current

[Complete the Rust SDK, Node SDK, and CLI rewrite](plans/rust-sdk-node-sdk-cli-rewrite.md)

All eight operations share one Rust implementation across the Rust SDK, Node
SDK, and standalone CLI. Phase 3 is merged into the rewrite integration branch.
Phase 4 runtime/artifact cutover is merged through PR #29. Its final deletion
slice removes the inactive TypeScript source and updates evidence references;
review and exact-head CI remain before repository completion. The active plan
owns the current slice and evidence.
Published v0.6.0 remains TypeScript; Rust v0.6.1 is unpublished.

## Plans

_None._

## Tasks

- [Expand held-out CLI workflow evals](tasks/expand-cli-workflow-evals.md)
- [Make DART industry codes discoverable](tasks/discover-industry-codes.md)
- [Support XBRL views](tasks/support-xbrl-views.md)
- [Improve large report content windows](tasks/improve-large-report-content-windows.md)
- [Repair disclosure-type provenance](tasks/repair-disclosure-type-provenance.md)
