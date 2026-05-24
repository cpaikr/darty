# Release

This repo publishes the npm package `@sjunepark/darty`. The npm package includes the Node-based `darty` CLI through `package.json` `bin`.

Release Please owns normal version bumps, `CHANGELOG.md`, source tags, and GitHub Releases. The Release workflow validates tagged source and publishes npm. This repo does not build or upload standalone OS-native binaries.

## Manual setup

Configure npm trusted publishing for `@sjunepark/darty`:

- Publisher: GitHub Actions
- Organization or user: `sjunepark`
- Repository: `darty`
- Workflow filename: `release.yml`

Configure this secret in this private repository:

- `RELEASE_PLEASE_TOKEN`: token used by `.github/workflows/release-please.yml` to open release PRs and create source tags/releases. Use a fine-grained PAT or GitHub App token, not the default `GITHUB_TOKEN`, so Release Please-created tags trigger `.github/workflows/release.yml`. Grant this repository Contents read/write and Pull requests read/write access.

npm publishing uses OIDC trusted publishing, so no npm publish token is required.

Protect `main` so release PRs cannot merge until `.github/workflows/ci.yml` passes. At minimum, require the `CI / validate` status check before merging. Release Please and CI both run from pushes to `main`, so branch protection is the gate that ensures release PR contents are validated before Release Please creates source tags and releases.

## Automated release flow

While the package is pre-1.0, Release Please treats normal `feat:` and `fix:` commits as patch releases and reserves minor bumps for breaking changes. This keeps rapid greenfield feature work on `0.0.x` unless a commit uses `!` or a `BREAKING CHANGE:` footer.

1. Land normal work on `main` using Conventional Commits, especially `feat:`, `fix:`, and `docs:`. Use `!` or a `BREAKING CHANGE:` footer for breaking changes.
2. `.github/workflows/ci.yml` validates pull requests with typecheck, tests, and the npm CLI build.
3. `.github/workflows/release-please.yml` opens or updates a release PR that bumps `package.json`, updates `.release-please-manifest.json`, and writes `CHANGELOG.md`.
4. Merge the release PR after CI passes.
5. Release Please creates the source tag and GitHub Release.
6. The source tag triggers `.github/workflows/release.yml`, which validates the package again and publishes npm.

The source tag must match `package.json` exactly. Version `x.y.z` uses source tag `vx.y.z`.

## Manual fallback

If automation needs to be bypassed, update `package.json` and `.release-please-manifest.json` to the same version, commit the change, and push a matching source tag:

```sh
git tag vx.y.z
git push origin main --tags
```

To republish an existing source tag without moving it, run the `Release` workflow manually with the `tag` input set to the existing tag, for example `v0.2.1`.

The workflow is idempotent. If the npm package version already exists, npm publish is skipped.
