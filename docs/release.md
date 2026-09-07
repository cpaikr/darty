# Release

Darty's release pipeline distributes the TypeScript CLI as standalone executables
with an embedded Bun runtime through **private GitHub Releases**. Consumers need
no Node.js, npm, Bun, source checkout, or GitHub CLI. npm publication is retired;
the root `package.json` is private and remains the development dependency and
version authority. The incomplete Rust/Node candidate is not published.

[Standalone delivery status](../plans/standalone-cli-delivery.md) owns first-release
readiness. [README installation](../README.md#설치) owns consumer instructions.

## Targets and verification

[`scripts/release-targets.json`](../scripts/release-targets.json) owns target IDs,
compiler targets, executable names, and Linux consumer runners. Versioned archives
contain only the executable and `LICENSE.md`. Releases also contain `install.sh`,
`install.ps1`, `SHA256SUMS`, and a source-bound `release-manifest.json`.

All CI jobs, **including release builds**, run on Linux. The pinned Bun compiler
cross-builds Linux GNU x64/ARM64, macOS ARM64, and Windows x64. Only Linux archives
receive automated runtime certification. macOS and Windows are cross-built and
checked for binary format/architecture, but their manifest entries explicitly set
`runtimeCertified: false`. This owner-selected policy overrides mytech's default
of testing every distributed platform. Linux GNU archives do not target Alpine/musl.

Each Linux consumer downloads the exact archive, verifies its checksum, installs
it through the published installer, and checks the installed executable digest.
It runs CLI v1 parity with an empty PATH so Node, npm, and Bun cannot supply a
runtime, and verifies failed-checksum recovery. Runtime config autoloading is
disabled in the compiler so the installed CLI does not read a nearby Bun config,
package manifest, tsconfig, or `.env` file.

Ordinary CI certifies Linux x64. Main-targeting PRs and release/candidate runs
build every target and certify both Linux architectures. Post-merge CI keeps the
Linux x64 gate without repeating ARM64. The Rust candidate's existing Linux
checks remain separate. No manual macOS or Windows jobs exist.

## Version preparation and authority

An operator owns the reviewed version change and source tag; CI owns archive
certification and GitHub publication. For the pre-1.0 line, compatible features
and fixes advance patch, and public-contract breaks advance minor. Assess the
actual contract rather than commit prefixes. Retiring npm/toolset distribution
requires a new minor version for the first standalone release. Historical npm
versions and GitHub releases remain untouched.

`package.json` owns `x.y.z`; its source tag is `vx.y.z`. A tag must identify an
exact `main` commit with successful `CI` push evidence. Do not infer a version
from a tag, move a tag, or reuse a published version. `CHANGELOG.md` remains
history through `v0.5.0`; GitHub generated notes own subsequent release summaries.

1. Validate the pipeline with a build-only candidate run and review its artifacts.
2. Prepare and review the version change; land it on `main`.
3. Wait for `CI` to succeed for that exact `main` SHA.
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

The **Release** workflow also accepts manual dispatch. Leave `tag` empty for a
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
stays private; downloads require repository access through the authenticated
GitHub Releases page. Do not place credentials in URLs or installers.

GitHub immutable releases are currently disabled. The pipeline never replaces
existing assets or tags and refuses to alter a published release. Administrators
can still mutate records outside it; immutability is enforced by the publisher,
not claimed as a repository setting. Exact-source CI checks remain necessary
because branch protection is unavailable on the current account plan.

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
```

`build` retains the Node-compatible TypeScript comparison baseline for the Rust
rewrite; it is not an npm release build. `test:standalone` compiles and certifies
the current supported Unix host without publishing. Cross-compilation may download
Bun's target runtime. Unit release tests use fake GitHub responses and temporary
local files; they never publish or mutate remote tags. Live DART/model evals remain
opt-in under [evals/README.md](../evals/README.md).

The dependency audit remains required in CI and tagged validation. Narrow Bun
`overrides` may resolve vulnerable transitives; validate frozen installation,
audit, and affected behavior when changing them.
