# Retire Release Please without weakening releases

## Outcome

Darty no longer depends on Release Please or a long-lived GitHub credential.
The shipped TypeScript package uses one explicit source-tag workflow that
reconciles version and source identity, requires exact-commit CI, publishes npm
through trusted publishing, and records the completed version as a GitHub
Release without overwriting an existing release.

## Current state

Completed in [PR #24](https://github.com/cpaikr/darty/pull/24). The
implementation removes the Release Please workflow, configuration, manifest,
credential dependency, and active ownership references. The retained
`.github/workflows/release.yml` now resolves a real `vx.y.z` tag to immutable
source, requires successful CI for that exact `main` commit, reconciles the tag
with `package.json`, repeats tagged validation, publishes
`@sjunepark/darty` through npm trusted publishing, and then creates or verifies
the same version's GitHub Release.

The full shipped-package and release-safety suite passes: frozen install, npm
audit, DART wire authority, 24 focused release tests, typechecking, 436 passing
tests with 23 opt-in live tests skipped, build, 31-scenario CLI compatibility,
mutation proof, workflow YAML syntax, and diff checks. Security review findings
for prerelease tags, ambiguous npm lookup failures, and existing-version
artifact identity are resolved. Codex review found no issue; CodeRabbit's sole
documentation finding was fixed and confirmed, every review thread is resolved,
and exact-head CI passed. No release, tag, publication, secret deletion, or
repository-setting mutation occurred.

The shipped product remains the TypeScript npm package during rewrite Phase 3.
Native archives, checksums, installers, and the supported target matrix belong
to the rewrite's Phase 4 distribution cutover, not this plan.

## Decisions

- Remove Release Please rather than rotate or broaden a retained credential.
- Preserve `package.json` as the current shipped package's version authority.
  Prepare a release with a normal reviewed version commit, wait for exact-commit
  CI, then have a maintainer explicitly create and push the matching `vx.y.z`
  source tag.
- Preserve the current pre-1.0 version-selection contract: ordinary `feat:` and
  `fix:` changes advance the patch version, while `!` or a
  `BREAKING CHANGE:` footer advances the minor version. Record this rule in the
  replacement runbook so removing the generator does not remove SemVer policy.
- Keep `CHANGELOG.md` as history through `v0.5.0`; GitHub Release notes own new
  release summaries after the replacement. Do not retain a second generated or
  manually synchronized changelog line.
- Preserve the existing audit, wire, compatibility, mutation, build,
  immutable-tag, and idempotent npm-publication gates.
- Treat npm's immutable package bytes as part of idempotent verification: an
  existing version completes the npm projection only when its registry
  integrity matches a dry-run pack of the validated source. Lookup uncertainty
  and mismatched bytes fail before GitHub Release completion.
- Create or verify the GitHub Release only after the tag has passed validation
  and the npm projection has either published successfully or been verified as
  already present. Use generated notes from the repository's versioned commit
  history so release notes do not require another retained generator.
- Keep one version and tag line. Phase 4 extends this workflow with verified
  native assets and installers and keeps npm as a projection of the same
  release rather than creating an independent release series.
- Removing the repository secret is owner administration outside local code
  changes and is not a completion dependency; the retired workflow must no
  longer reference it.

## Integrity boundary

GitHub immutable releases are disabled for this repository as of 2026-08-24.
Repository settings remain unchanged: the workflow refuses to overwrite an
existing release, rechecks tag-to-validated-source identity immediately before
release completion, and documents that repository administrators can still
mutate the release record outside the workflow. This preserves the strongest
repository-owned fail-closed boundary available within the authorized scope.

## Included work

- Remove the Release Please workflow, configuration, manifest, ownership
  instructions, and—after the runbook no longer links to it—the superseded
  credential-repair task file.
- Update the retained release workflow to create or verify the corresponding
  GitHub Release under the selected integrity boundary without weakening its
  current source, version, CI, validation, trusted-publishing, or rerun
  behavior.
- Rewrite the release runbook around reviewed version commits and explicit
  source tags, including recovery and idempotent rerun behavior.
- Reconcile affected release, instruction, roadmap, and rewrite-plan
  documentation with the new current release authority while keeping the
  unpublished Rust candidate outside the release.
- Add focused deterministic validation for new repository-owned release logic
  where practical, and validate the complete workflow and shipped package.

## Excluded work

- Publishing a release, pushing a tag, deleting the remote secret, or mutating
  any other GitHub repository setting.
- Selecting the Rust/Node target matrix or publishing candidate crates, native
  packages, archives, checksums, installers, or standalone binaries.
- Changing the npm package identity, CLI v1 contract, rewrite capability scope,
  or current TypeScript-to-Rust cutover order.

## Completion

No active configuration, workflow, documentation, or queue entry assigns
release ownership to Release Please or requires `RELEASE_PLEASE_TOKEN`. The
replacement runbook preserves the current version-selection contract. A real
source tag remains fail-closed against tag/version/source/CI drift, the shipped
npm package remains idempotently publishable through OIDC, and the same
successful run idempotently creates or verifies the GitHub Release under the
selected integrity boundary. Relevant workflow checks and the documented
TypeScript validation/build/compatibility commands pass, and review finds no
weakened release gate or accidental candidate publication.

## Next action

_None — plan complete._
