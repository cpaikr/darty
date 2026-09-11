# Standalone CLI release delivery

Status: delivered in [v0.6.0](https://github.com/cpaikr/darty/releases/tag/v0.6.0).
This historical record describes the Bun/TypeScript standalone release. Rust
v0.6.1 subsequently replaced it, and distribution is now public. The
[README](../README.md) records current availability; the
[release runbook](../docs/release.md) owns release operations.

## Original accepted scope

Replace npm registry delivery with private GitHub Releases containing standalone
CLI archives and SHA-256 checksums. Installation requires no Node.js, npm, Bun,
source checkout, or GitHub CLI. Keep the existing TypeScript operation behavior;
this packaging change does not publish the incomplete Rust candidate.

Build Linux x64/ARM64, macOS ARM64, and Windows x64 from Linux using the pinned
Bun compiler. All CI jobs, including release builds, stay on Linux. Certify the
exact Linux archives through the installed CLI boundary; record macOS/Windows
as cross-built without CI runtime certification. Preserve source tags and assets;
resume only matching partial drafts and never overwrite published artifacts.

## Completion evidence

- Reconciled the intended distribution and Linux-only job policy with the owner.
- Confirmed the current CLI has no runtime source-file or child-runtime dependency.
- Implemented one target authority, standalone archives, clean installers,
  Linux certification, and resumable GitHub publication. npm delivery is retired.
- Built all four target executables locally; the local standalone consumer passed
  CLI parity with no runtime on PATH and failed-install preservation checks.
- Full local suite, audit, typecheck, wire checks, comparison parity, and mutation
  proof passed. Bounded code review found no remaining actionable issues.
- Reconciled installation, release, architecture, vision, and rewrite-plan docs.
- Hosted [build-only candidate run](https://github.com/cpaikr/darty/actions/runs/34104759559)
  passed for source `87d4ae0fac991f9f4e019a9b2d39673e1ce79e9b`: all four
  targets cross-built on Linux, both Linux consumers certified, and the release
  bundle verified. Publication was skipped because no source tag was supplied.

## Publication

[Release run](https://github.com/cpaikr/darty/actions/runs/34106935042) published
v0.6.0 from `8bac7c9741c3253d11a95e448dfed97f95c30074` after exact-source CI
passed. All four archives, both installers, checksums, and the manifest were
verified after publication. GitHub reported v0.6.0 as the latest stable release
at that time.

## Next action

None — complete. Rust artifact replacement belongs to the
[rewrite plan](rust-sdk-node-sdk-cli-rewrite.md).
