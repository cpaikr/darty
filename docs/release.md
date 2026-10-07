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
through the release installer, verify the installed digest and the upgrade
receipt the installer writes beside it, run the network-free CLI contract with
an empty PATH, and verify that failed-checksum recovery leaves the executable
and receipt unchanged. Receipt-managed `darty upgrade` replacement is tested
against a local fixture release; CI exercises it on Linux only. Rust needs
no Node, npm, Bun, config autoloading, or source checkout to run.

Windows installer visibility is not runtime-certified in CI. The repository
keeps all automated jobs on Linux, and a process descended from a packaged
(MSIX) app is not an external consumer: it can see redirected files that no
other program can. A Windows release validation record must come from a process
outside any packaged app's process tree and must show, for the exact selected
directory, that the file is visible, runs by full path, and is what `darty`
resolves to from the persisted `PATH`.

[`scripts/verify-windows-install.ps1`](../scripts/verify-windows-install.ps1)
produces that record unattended. It relaunches itself through the Windows
management service, so the checking process is a child of `WmiPrvSE.exe` and
not of the caller; it records its own process ancestry and fails if any
ancestor is a packaged app. An agent or a person can run it from any shell:

```powershell
.\scripts\verify-windows-install.ps1 -BinDirectory 'C:\the\directory\you\selected' -ExpectedVersion '0.6.3'
```

Replace the directory and version with the installation being validated.

A manually opened PowerShell session running the equivalent checks in
[Windows installation recovery](windows-installation.md#verify-the-file-before-changing-path)
remains acceptable evidence. The installer itself probes a file handle and
rejects a physical path redirected away from the advertised destination, but
that host-local check does not replace independent-consumer evidence.

The manifest's `runtimeCertified` flag records CI runtime certification at
build time, so the Windows entry stays `false`: host validation happens after
publication and cannot change a published manifest. Record it here instead.

### Windows validation records

- **v0.6.3, 2026-10-02, Windows 11 (10.0.26200) x64.** Installed with the
  released `install.ps1` into `%USERPROFILE%\.local\bin` from a shell descended
  from a packaged desktop app.
  `verify-windows-install.ps1 -BinDirectory "$env:USERPROFILE\.local\bin" -ExpectedVersion 0.6.3`
  passed under PowerShell 7.6.6 and Windows PowerShell 5.1 with ancestry
  `WmiPrvSE.exe <- svchost.exe <- services.exe <- wininit.exe`. The installed
  executable's SHA-256,
  `26bd8f8beedc1407d2415d28df76bc2b7bf54b35f39f3754c0b8adc84288bf3d`, matches
  `darty.exe` in the release archive, whose digest matches `SHA256SUMS`.
  Limitation: the released installer could not replace the previously installed
  executable (see the README update note); the old file was renamed first.
- **v0.6.4, 2026-10-02, Windows 11 (10.0.26200) x64.** The installed v0.6.3
  reported comparison `newer` for v0.6.4 through `darty version --check`. The
  README unattended recipe then upgraded `%USERPROFILE%\.local\bin` in place
  with the released `install.ps1`, from a shell descended from a packaged
  desktop app and with no manual step.
  `verify-windows-install.ps1 -BinDirectory "$env:USERPROFILE\.local\bin" -ExpectedVersion 0.6.4`
  reported that directory's `darty.exe` as visible and passed with ancestry
  `powershell.exe <- WmiPrvSE.exe <- svchost.exe <- services.exe`. The installed
  executable's SHA-256,
  `e7884ccbc1def1ca5ee0951852e8a1434addacbb6a8c5312a6e27e06f1f5afbb`, matches
  `darty.exe` in the release archive, whose digest matches `SHA256SUMS`.
- **v0.7.0, 2026-10-07, Windows 11 (10.0.26200) x64.** The installed v0.6.4
  reported comparison `newer` for v0.7.0 through `darty version --check`. The
  README unattended recipe reinstalled `%USERPROFILE%\.local\bin` with the
  released `install.ps1`, which wrote `.darty-receipt.json`; `darty upgrade
  --check` accepted that receipt and reported v0.7.0 as current.
  `verify-windows-install.ps1 -BinDirectory "$env:USERPROFILE\.local\bin" -ExpectedVersion 0.7.0`
  passed with ancestry
  `powershell.exe <- WmiPrvSE.exe <- svchost.exe <- services.exe`. The installed
  executable's SHA-256,
  `9151faa85de8ac45b6c8d372a4ab191430a28ec999891c80af777988ad448f9d`, matches
  `darty.exe` in the release archive and the receipt, and the archive digest
  matches `SHA256SUMS`. A receipt-managed `darty upgrade` replacement awaits the
  next release.

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

Repository Actions stay enabled, but every job, including reusable jobs,
requires both the original actor and the rerun actor to be `sjunepark`. CI runs
automatically for pull requests authored by `sjunepark` from a branch of this
repository, and otherwise only by manual dispatch. Other authors' pull requests,
tags, and schedules do not authorize a run; their CI jobs are skipped. Release
has only a manual dispatch trigger. All outside contributors also require
workflow approval in the repository's fork policy, including returning
contributors.

The CI workflow reports the `ci/validated-source` commit status on its exact
source SHA. It marks the status pending before validation and reports success
only when repository validation and all standalone build/certification jobs
succeed. A failed, cancelled, or skipped prerequisite cannot produce success;
an interrupted reporter can leave the status pending. Runs for the same SHA
are serialized. Only the reporting jobs receive `statuses: write`; they use
the workflow's GitHub token and do not check out or execute repository code.

Branch protection should require `ci/validated-source` from the GitHub Actions
App. This explicit status is needed because the observed manual workflow checks
were absent from GitHub's merge-status summary even after a successful run.
The status links to the real run; it is not a manually asserted substitute for
validation. For a fresh complete measurement, dispatch the whole workflow;
partial reruns retain GitHub's successful prerequisite results for the same SHA.

Pull request runs validate and report on the PR head SHA. To run CI manually,
dispatch it for the selected branch:

```sh
gh workflow run ci.yml --repo cpaikr/darty --ref main
```

Older branches and tags can retain automatic triggers from before this policy;
review their workflow files before pushing them. A fork contribution must first
be reviewed and placed on a repository branch, then dispatched manually or
re-opened as a maintainer-authored pull request. Release evidence requires CI
dispatched on `main` for the exact source SHA. Dispatching and rerunning
workflows outside a maintainer pull request require explicit maintainer
authorization; ordinary implementation work does not authorize them.

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

   Tag creation does not trigger publication. Actions stay enabled under the
   [maintainer-controlled policy](#maintainer-controlled-actions); do not
   disable them after the run.

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
