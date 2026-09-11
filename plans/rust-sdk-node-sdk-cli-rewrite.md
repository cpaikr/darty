# Rust SDK, Node SDK, and CLI rewrite

Status: repository outcome complete on 2026-09-08. This is a completed delivery
record, not an active plan. Rust artifacts were subsequently published in
[v0.6.1](https://github.com/cpaikr/darty/releases/tag/v0.6.1) on 2026-09-09.
[Architecture](../ARCHITECTURE.md) owns current implementation,
[the release runbook](../docs/release.md) owns current distribution and approvals,
and [the roadmap](../ROADMAP.md) owns remaining work.

## Delivered outcome

One Rust SDK implements all eight accepted read-only DART operations. The
asynchronous Node SDK and standalone CLI adapt that implementation, preserving
[CLI v1](../docs/specs/cli-transport-v1.md). The superseded TypeScript DART
implementation, conformer, source-local toolset, and candidate npm CLI launcher
were removed. TypeScript remains in the Node facade and development tooling.

Delivery to `codex/finish-rust-rewrite-integration` preserved individual commits:

- [PR #27](https://github.com/cpaikr/darty/pull/27), merged as `3c4ba7e`, completed
  capability parity and refreshed source evidence.
- [PR #29](https://github.com/cpaikr/darty/pull/29), merged as `4b70251`, delivered
  runtime cutover and validated SDK/CLI artifacts.
- [PR #30](https://github.com/cpaikr/darty/pull/30), merged as `fb31a04`, removed
  the remaining inactive source.

The last two slices replaced oversized PR #28 at the owner's request. Each
completed CodeRabbit and Codex review with actionable feedback resolved. The
[original goal](../goals/finish-rust-rewrite.md) preserves the contract and
review-partition amendment.

## Decisions retained

- Shared semantics across Rust, Node, and the native CLI justified the rewrite;
  no performance gain was claimed, and TypeScript already supported standalone
  installation. The work remained within the accepted product surfaces.
- Rust owns DART transport, bounds, decoding, parsing, normalization, and source
  failures. Neither adapter introduces another protocol implementation.
- Independent wire fixtures and CLI expectations remained the oracle. Source
  drift, viewer grammar, regex literals, no-TOC initialization, and tree bounds
  were reconciled with the contract before parity was claimed.
- TypeScript remained runnable through parity validation. The authorized review
  split allowed inactive source for one intermediate PR, followed immediately by
  deletion; it did not establish a second supported runtime path.
- CLI installation remained independent of Node. SDK packaging used one version
  and source authority without requiring an npm launcher or registry publication.
- Linux-only CI was an explicit project decision. Cross-built macOS/Windows
  binaries and the macOS addon did not inherit Linux runtime certification.
- Technical packaging and repository-cutover decisions were delegated on
  2026-09-08. Human production approval, paid model use, tags, and publication
  were excluded from that delegation and from this repository outcome.

## Completion evidence

[CI 34190295828](https://github.com/cpaikr/darty/actions/runs/34190295828) passed
for implementation `064f580`: Rust validation and audits, harness and CLI
compatibility tests, SDK consumers and declarations, cross-builds, installed Linux
CLI archives, clean Linux Rust/Node consumers, and bundle assembly.
[Build-only run 34183249366](https://github.com/cpaikr/darty/actions/runs/34183249366)
validated the release workflow without publication. Downloaded hashes and source
identity, local exact macOS SDK consumption, and installed CLI process/live checks
also passed. The [provider record](../docs/research/dart-provider-qualification.md)
retains the bounded 2026-09-08 evidence for source-backed operations.

At repository completion, v0.6.0 was the published TypeScript release and Rust
v0.6.1 was unpublished. Subsequent publication is a separate event; it does not
retroactively establish model reliability or human provider approval.
[Release approvals](../docs/release.md#release-approvals) own those distinctions.

## Remaining boundary

No rewrite action remains. XBRL, industry discovery, held-out workflow expansion,
and broader content pagination remain separate [backlog tasks](../ROADMAP.md).
The cutover repaired AXI local-evidence paths without changing its upstream
baseline; independent drift review belongs to the
[AXI procedure](../docs/upstreams/axi.md).
