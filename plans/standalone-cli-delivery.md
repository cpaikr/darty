# Standalone CLI release delivery

Status: implementation reviewed; hosted candidate validation pending.

## Accepted scope

Replace npm registry delivery with private GitHub Releases containing standalone
CLI archives and SHA-256 checksums. Installation requires no Node.js, npm, Bun,
source checkout, or GitHub CLI. Keep the existing TypeScript operation behavior;
this packaging change does not publish the incomplete Rust candidate.

Build Linux x64/ARM64, macOS ARM64, and Windows x64 from Linux using the pinned
Bun compiler. All CI jobs, including release builds, stay on Linux. Certify the
exact Linux archives through the installed CLI boundary; record macOS/Windows
as cross-built without CI runtime certification. Preserve source tags and assets;
resume only matching partial drafts and never overwrite published artifacts.

## Progress

- Reconciled the intended distribution and Linux-only job policy with the owner.
- Confirmed the current CLI has no runtime source-file or child-runtime dependency.
- Implemented one target authority, standalone archives, clean installers,
  Linux certification, and resumable GitHub publication. npm delivery is retired.
- Built all four target executables locally; the local standalone consumer passed
  CLI parity with no runtime on PATH and failed-install preservation checks.
- Full local suite, audit, typecheck, wire checks, comparison parity, and mutation
  proof passed. Bounded code review found no remaining actionable issues.
- Reconciled installation, release, architecture, vision, and rewrite-plan docs.

## Remaining

Run the hosted build-only candidate workflow and record Linux cross-build and
consumer evidence. First standalone publication remains a separate release action. Do not create a release tag as part of
this change.
