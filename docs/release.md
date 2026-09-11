# Release

The repository publishes the Rust standalone CLI, Rust SDK crate, and native Node
SDK tarballs through public GitHub Releases. [README](../README.md) records
release availability and CLI installation; v0.6.0 contains the historical
TypeScript CLI. The root private `package.json` owns the version, synchronized
with every Cargo package and `packages/node/package.json`. Public npm and
crates.io publication are not used.

This runbook owns artifact certification, SDK installation, and release
operations. [ROADMAP](../ROADMAP.md) owns delivery status and routes to active
plans. Release signoff, human production approval, and paid-model evals remain
separate gates; technical completion does not authorize publication.

## Targets and verification

[`scripts/release-targets.json`](../scripts/release-targets.json) owns CLI targets,
Rust triples, executable names, and Linux consumer runners. CLI archives contain
only the executable and `LICENSE.md`. The bundle also contains the Rust `.crate`,
Node tarballs for Linux GNU x64 and macOS ARM64, installers, `SHA256SUMS`, and a
source-bound `release-manifest.json`. Each Node tarball contains its native addon,
JavaScript adapter, declarations, license, and package metadata; it has no CLI
launcher, install scripts, or optional platform dependency.

All CI jobs, including cross-builds, run on Linux. Digest-pinned cargo-zigbuild
and cargo-xwin containers build Linux GNU x64/ARM64, macOS ARM64, and Windows x64
with Rust 1.88. GNU builds target glibc 2.28; Alpine/musl is unsupported. macOS
builds target macOS 11. Binary headers and architecture are checked before packing.
Only Linux CLI archives receive CI runtime certification; macOS and Windows
manifest entries explicitly set `runtimeCertified: false`.

Linux consumers download the exact CLI archive, verify its checksum, install it
through the release installer, verify the installed digest, run the network-free
CLI contract with an empty PATH, and verify failed-checksum recovery. Rust needs
no Node, npm, Bun, config autoloading, or source checkout to run.

Windows installer visibility is not independently runtime-certified in CI. The
repository keeps all automated jobs on Linux, and a PowerShell process launched
by a packaged installer is not an external consumer for this purpose. A Windows
release validation record must come from a separately launched normal PowerShell
session and must show both checks below for the exact selected directory:

```powershell
$bin = 'C:\the\directory\you\selected'
$exe = Join-Path $bin 'darty.exe'
Test-Path -LiteralPath $exe -PathType Leaf
& $exe --help
Get-Command darty -CommandType Application
darty --help
```

The first two commands establish full-path file visibility and CLI execution.
For command-name discovery, also
[verify that `darty` resolves to the selected executable](windows-installation.md#verify-command-resolution);
the last two commands alone could find an older installation. Until that
independent Windows evidence exists, the Windows manifest entry must remain
uncertified. The installer itself probes a file handle and rejects a physical
path redirected away from the advertised destination, but that host-local check
does not replace independent-consumer evidence. See
[Windows installation recovery](windows-installation.md) for redirected paths
and PATH setup.

A clean Linux Node consumer installs the downloaded native tarball offline with
lifecycle scripts disabled. A clean external Rust consumer compiles and runs
against the unpacked crate. Their manifest entries record consumer certification;
the cross-built macOS Node tarball is format-checked but has no CI runtime claim.
The full fixture-backed Node consumer and CLI judge run separately from production
artifacts. Fixture-origin hooks are rejected by production packaging.

An authorized CI or build-only release run builds all targets and certifies both
Linux CLI architectures. Shared validation includes
Rust tests, Clippy, rustdoc, dependency audits, Node declarations and consumers,
wire authority, eval harness tests, CLI parity, and mutation sensitivity.

## Maintainer-controlled Actions

The repository-level Actions setting was verified disabled on September 11,
2026. The checked-in CI and Release workflows have only manual dispatch triggers.
Every job, including reusable jobs, requires both the original actor and the
rerun actor to be `sjunepark`. Pushes, pull requests, tags, and schedules do not
authorize a run. All outside contributors require workflow
approval in the repository's fork policy, including returning contributors.

For an explicitly authorized run, `sjunepark` enables Actions, dispatches the
selected workflow and branch, waits for completion, and disables Actions again:

```sh
gh api --method PUT repos/cpaikr/darty/actions/permissions -F enabled=true
gh workflow run ci.yml --repo cpaikr/darty --ref main
```

Inspect the dispatched run in Actions. After it completes, disable Actions:

```sh
gh api --method PUT repos/cpaikr/darty/actions/permissions -F enabled=false
```

Review the exact selected branch and its workflow files before dispatch. Older
branches and tags can retain automatic triggers; avoid pushing them while Actions
is enabled. A fork contribution must first be reviewed and placed on a repository
branch before manually dispatching CI for that branch. Release evidence requires
CI dispatched on `main` for the exact source SHA. Enabling Actions, dispatching,
and rerunning workflows require explicit maintainer authorization; ordinary
implementation work does not authorize them.

GitHub secret scanning and push protection guard the public repository separately
from Actions. `.env` and `.env.*` are ignored; only the checked-in `.env.schema`
is exempt. Keep real credentials in ignored local files or a secret manager.

## SDK consumption

Download SDK artifacts and `SHA256SUMS` from the same release in this repository;
public downloads require no login. Verify their SHA-256 before installation.
Node requires 22.12.0 or newer and a matching OS/architecture; Linux requires
glibc 2.28 or newer. Install the
selected tarball with `npm install --offline --ignore-scripts --no-audit --no-fund /absolute/path/to/darty-node-<version>-<target>.tgz`.
Import `DartyClient` and `DartyError` from `@sjunepark/darty`. There is no build or
native download during installation; unsupported targets have no fallback.

For Rust 1.88 or newer, unpack `darty-<version>.crate` into a versioned vendor
folder and use `darty = { path = "vendor/darty-<version>" }` in the consumer's
Cargo dependencies. The SDK uses Tokio for network operations. Cargo resolves
its declared transitive dependencies normally; retain the consumer's lockfile.
`DartyClient` is the shared entry point, with typed request/result/error models.
The crate is not fetched from crates.io.

CLI and both SDK artifacts share one source/version. CLI compatibility is owned
by [CLI v1](specs/cli-transport-v1.md); SDK compatibility is defined by the public
Rust types and packaged Node declarations. The version policy is defined
[below](#version-preparation-and-authority). Consumers should retain their chosen
artifact and lockfile rather than infer SDK compatibility from CLI v1.

## Release approvals

The [agent workflow evidence](research/agent-workflow-readiness.md) records the
declared diagnostic sample; it does not waive any release gate below.

The maintainer acting as release operator owns production decisions for each release:
obtain a named approval in the
[provider record](research/dart-provider-qualification.md#maintainer-approval-records),
run authorized paid-model evals under the [eval gate policy](../evals/README.md#gate-policy),
and review the exact-source build-only bundle. Implementation work does not authorize
these approvals, paid runs, source tags, or publication. CI artifacts remain
temporary evidence until that operator completes the release procedure below.

## Version preparation and authority

An operator owns the reviewed version change and source tag; CI owns archive
certification and GitHub publication. For the pre-1.0 line, compatible features
and fixes advance patch, and public-contract breaks advance minor. Assess the
actual contract rather than commit prefixes. Historical npm versions and GitHub
releases remain untouched.

`package.json` owns `x.y.z`; its source tag is `vx.y.z`. A tag must identify an
exact `main` commit with successful maintainer-dispatched `CI` evidence. Do not
infer a version from a tag, move a tag, or reuse a published version. `CHANGELOG.md` remains
history through `v0.5.0`; GitHub generated notes own subsequent release summaries.

1. Validate the pipeline with a build-only candidate run and review its artifacts.
2. Prepare and review the version change; land it on `main`.
3. Explicitly dispatch `CI` on `main` and wait for success for that exact SHA.
4. Fetch the remote source and tags, verify that the matching tag is unused,
   and explicitly create and push only that source tag:

   ```sh
   set -eu
   git fetch origin main --tags
   SOURCE_SHA="$(git rev-parse origin/main)"
   PACKAGE_VERSION="$(git show "$SOURCE_SHA:package.json" | node -e 'let data=""; process.stdin.on("data", chunk => data += chunk); process.stdin.on("end", () => console.log(JSON.parse(data).version));')"
   SOURCE_TAG="v$PACKAGE_VERSION"
   REMOTE_TAG="$(git ls-remote --refs origin "refs/tags/$SOURCE_TAG")"
   test -z "$REMOTE_TAG"
   git tag "$SOURCE_TAG" "$SOURCE_SHA"
   git push origin "refs/tags/$SOURCE_TAG"
   ```

   Confirm exact-SHA CI success before the last two commands. A failed remote
   lookup is not evidence that a tag is unused. Tagging is an explicit release
   action and is not part of ordinary implementation work.

5. Manually dispatch **Release** on `main` with the existing source tag:

   ```sh
   gh workflow run release.yml --repo cpaikr/darty --ref main -f tag="$SOURCE_TAG"
   ```

   Tag creation does not trigger publication. Keep Actions enabled only for the
   authorized workflow runs and disable it after completion.

The **Release** workflow requires manual dispatch. Leave `tag` empty for a
candidate run of the selected branch: it builds, certifies, and uploads temporary
workflow artifacts without creating a tag or GitHub Release. Supply an existing
source tag only to complete or verify that tagged release.

## Publication and recovery

The workflow rechecks the remote tag before publication. The publisher validates
the complete bundle inventory, source/version identity, and every checksum, then
creates a draft with generated notes. It uploads only missing assets, downloads
all assets, compares their exact bytes, rechecks the tag, and finally publishes
the draft. It reads back the published state and downloads the assets again
before reporting success. Temporary Actions artifacts are handoff storage, not
the supported installation channel.

Only the final job has `contents: write`. npm credentials, OIDC publication
permissions, and npm lifecycle hooks are not part of this pipeline. The repository
and release downloads are public. Publishing still requires maintainer consent
and repository write access. Do not place credentials in URLs or installers.

GitHub immutable releases were verified disabled on September 11, 2026. The
pipeline never replaces existing assets or tags and refuses to alter a published
release. Administrators can still mutate records outside it; immutability is enforced by the publisher,
not claimed as a repository setting. The Release workflow requires exact-source
CI evidence regardless of branch-protection settings.

The release operator owns failures and recovery:

- Source/validation failures require a reviewed fix and a new version/tag.
  Infrastructure failures may retry unchanged source.
- An interrupted upload leaves a draft. Rerun failed jobs to reuse the same
  bundle; existing assets must match byte-for-byte before missing assets upload.
- If a rebuild differs from the existing draft, stop and inspect it. The
  publisher will not replace assets. Prefer reusing the original CI artifact or
  preparing a new version; do not move the source tag.
- A published release is verified without mutation. Missing, extra, or differing
  assets fail verification; corrections require a new version.
- A moved or deleted tag, uncertain GitHub lookup, or failed asset readback stops
  completion. Inspect the remaining draft/published state before retrying.

## Local validation

```sh
bun install --frozen-lockfile
bun audit --audit-level=high
bun run check:dart-wire
bun run check:release
bun run typecheck
bun test
bun run build
bun run test:compat:cli
bun run test:standalone
bun run test:sdk
bun run check:versions
```

`build` compiles the production Rust CLI and Node addon with Rust 1.88.
`test:standalone` packages and certifies the current supported Unix host without
publishing. `test:sdk` checks packaged Node consumers; `check:versions` enforces
version synchronization. Cross-builds may download compiler helpers and target
SDKs. Release tests use temporary files and fake GitHub responses and never
publish or mutate remote tags. Live DART/model evals remain opt-in under
[evals/README.md](../evals/README.md).

The Rust audit and deny checks and Bun development-dependency audit remain
required in CI and tagged validation. No credentials are required to consume
already downloaded SDK artifacts.
