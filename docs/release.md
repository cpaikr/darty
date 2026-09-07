# Release

This repository publishes the shipped TypeScript npm package
`@sjunepark/darty`, including its Node-based `darty` CLI. A reviewed
`package.json` version commit and an explicit matching source tag authorize the
single Release workflow. The retained Rust/Node/CLI candidate is unpublished
and outside this flow.

## Manual prerequisites

Configure npm trusted publishing for `@sjunepark/darty` with GitHub Actions,
repository `cpaikr/darty`, and workflow `release.yml`. Publishing uses OIDC, so
no npm token or long-lived GitHub credential is required.

Branch protection and rulesets are unavailable for the current private-repo
account plan. Repository workflows therefore fail closed on exact source
identity: a release tag must resolve to a commit on `main` with a successful
`CI` push run for that exact SHA. If branch protection becomes available,
require `CI / validate` as defense in depth.

GitHub immutable releases are disabled for this repository. The workflow
resolves the actual tag to the validated commit immediately before release
completion, refuses to edit or replace an existing release, and verifies its
tag name, published stable state, title, release notes, and public URL. GitHub's
`targetCommitish` metadata may be a branch name and is not tag identity.
Repository administrators can still mutate release records outside
the workflow; enabling immutable releases later would strengthen this external
boundary without changing the flow.

## Version selection

`package.json` is the shipped package's version authority. For the current
pre-1.0 line:

- backward-compatible `feat:` and `fix:` changes advance the patch version;
- a public-contract break marked with `!` or a `BREAKING CHANGE:` footer
  advances the minor version; and
- non-user-facing documentation, test, refactor, build, and maintenance work
  does not require a release by itself.

Assess the actual CLI, package, toolset, runtime, and support-policy diff rather
than relying only on commit prefixes. `CHANGELOG.md` is retained as generated
history through `v0.5.0`; GitHub generated release notes own later summaries.
Do not update both.

Version `x.y.z` uses source tag `vx.y.z`. A version is never inferred from a
tag, and a release tag must never be moved or reused.

## Prepare and authorize a release

1. Choose the next version from the policy above. Update only the reviewed
   package version authority and any lockfile field that the package manager
   actually derives from it.
2. Land that version change on `main` through normal review, using a commit such
   as `chore(release): prepare v0.5.1`.
3. Wait for `CI` to succeed for that exact `main` SHA. A later `main` commit
   requires its own successful CI evidence before it can be tagged.
4. Resolve the reviewed version and exact remote source, verify that the tag is
   unused, then create and push only the matching source tag:

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

   An empty successful `git ls-remote` result establishes that the tag is
   unused; a network failure or a non-empty result must stop the procedure.
   Confirm the successful exact-SHA CI run in GitHub before executing the final
   two commands. Creating or pushing the tag is an explicit release action and
   is never part of ordinary implementation work.

Pushing the source tag starts `.github/workflows/release.yml`. A manual dispatch is
only a rerun mechanism for a real, unmoved source tag; it cannot nominate a
branch or untagged SHA.

## Fail-closed workflow

The Release workflow performs these gates in order:

1. Resolve the real remote `vx.y.z` tag to immutable source, check out that
   exact commit, require a successful `CI` push run for the same SHA on `main`,
   and require `package.json` version equality.
2. Recheck the tag, install the frozen dependency graph, audit high-severity
   dependencies, validate DART wire authority, typecheck, test, build, check the
   CLI v1 compatibility corpus, and prove mutation sensitivity.
3. Pack the validated build once with pinned npm, inspect the package member
   allowlist and required exports, and record SHA-256 and SHA-512 digests.
   Pass that archive to the shared clean-consumer matrix. Each consumer verifies
   its digest and source version, installs it with npm, checks the installed bin
   and toolset export, and runs the full CLI v1 compatibility corpus.
4. Recheck the tag again, download the certified archive, verify its digest and
   source identity, and publish that exact tarball with lifecycle scripts disabled
   through npm trusted publishing. Publish only when the registry returns a
   definite missing-version response and the existing public package identity
   is independently verified. If the exact version exists, compare its
   registry integrity with the certified archive digest and skip only
   when the package bytes match. After a new publication, read back registry
   version and integrity before allowing GitHub Release completion.
5. After npm succeeds or is verified already present, recheck that the remote
   tag's peeled commit equals the validated source SHA immediately before
   GitHub Release completion. Create a published stable
   release with generated notes only when none exists. Otherwise verify the
   existing release's tag name, non-draft/non-prerelease state,
   non-empty title and notes, and public URL without editing it.

The final job has `contents: write`; npm publication alone has `id-token: write`.
No workflow step administers pull requests, branches, tags, or repository
settings.

## CI runner policy

`dev` is the development integration branch; `main` is the release source.
Pull requests and pushes to either branch run `CI`. Successful `dev` validation
does not replace the exact-commit `main` CI evidence required for a release.

All GitHub Actions jobs run on Linux. Ordinary validation and development-branch
consumer checks use Linux x86_64 on `blacksmith-2vcpu-ubuntu-2404`. Pull requests
targeting `main` and every release also certify Linux ARM64. Both architectures
check Node 22.12.0 and 24. The shared
[`package-consumer.yml`](../.github/workflows/package-consumer.yml) owns this
matrix. Post-merge pushes retain Linux x86_64 validation and exact-SHA CI
evidence without repeating ARM64 checks.

Project policy explicitly excludes macOS and Windows CI, including manual
workflows, even when distributing software for those platforms. This overrides
mytech's full supported-platform verification preference. The platform-neutral
npm package remains available on macOS and Windows, but publication does not
claim automated verification on those systems. Linux uses 2-vCPU Blacksmith
runners. The first remote run must establish hosted Linux evidence.

npm remains the supported installation and durable versioned artifact channel
for the shipped TypeScript package. Following krx-cli's build-once archive
handoff, consumers install the exact `.tgz` that publication sends to npm;
temporary Actions artifacts are only handoff storage. Darty retains
package-manager delivery rather than introducing a standalone binary/installer
before the Rust cutover. Future native publication must account for this
Linux-only CI policy separately; no Rust candidate artifacts enter this
workflow.

Candidate packaging remains a local, opt-in check using
`node scripts/test-rust-candidate.mjs` after the candidate builds described in
the script's preconditions. It publishes nothing and is not a release
prerequisite.

## Dependency audit policy

`bun audit --audit-level=high` is required in CI and tagged validation.
`package.json` may use narrow Bun `overrides` for vulnerable transitives only
when the selected releases are compatible with the supported Node engine.
Treat `package.json` and the lockfile as the exact dependency authority. Remove
or update an override when the direct dependency graph incorporates the fix,
and verify frozen installation plus the audit after every change.

## Recovery and idempotent reruns

- If validation fails before npm publication, do not move the tag. Fix the
  problem through a newly reviewed package version and a new source tag.
- If npm published but registry readback or GitHub Release completion failed,
  manually dispatch the Release workflow with the same existing tag. The npm step verifies and skips
  the byte-identical published version, then the final job creates or verifies
  the release.
- If npm lookup fails for authentication, registry, or transport reasons, the
  workflow stops without attempting publication. Rerun only after the registry
  is healthy.
- If the source pack differs from an existing immutable npm version, the
  workflow stops before GitHub Release completion. Do not overwrite or reuse
  the version; investigate the publication and prepare a new reviewed version.
- If the workflow reports that an existing GitHub Release does not match the
  tag name or stable published state, it will not overwrite the
  record. Stop and have a repository administrator investigate the external
  mutation before rerunning.
- If a concurrent run creates the same valid release, the losing run verifies
  it and succeeds. Other creation failures remain failures.
- If the tag was deleted or moved, the workflow fails every identity recheck.
  Do not recreate or retarget it; prepare a new version.

## Release-safety validation

Before merging release-path changes, run:

```sh
bun install --frozen-lockfile
bun audit --audit-level=high
bun run check:dart-wire
bun run check:release
bun run typecheck
bun test
bun run build
bun run test:compat:cli
bun run test:package
```

`bun run test:package` builds and packs locally, then installs the archive in a
temporary clean npm project and verifies the installed CLI and toolset. It
requires registry access for runtime dependencies and publishes nothing.

The release tests use a fake GitHub CLI boundary and temporary local Git
repositories to verify tag identity. They never change remote GitHub tags,
publish a package, or create a GitHub Release. Live DART and hosted-model evals
remain opt-in evidence for product behavior changes and are not required for
release-administration-only changes.

For CLI contract, workflow, eval-harness, or answer-quality changes, select the
relevant opt-in readiness checks from [`evals/README.md`](../evals/README.md).
Run `bun run env:check` before any hosted-model check. The default
`OPENAI_MODEL` is the readiness baseline; overrides remain exploratory unless
the eval documentation promotes them.
