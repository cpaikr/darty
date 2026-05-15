# Release

This repo publishes two artifacts for the same `package.json` version:

- npm package: `@sjunepark/darty`
- standalone Bun-compiled binaries uploaded to `open-creo/open-creo` GitHub Releases

## Manual setup

Configure npm trusted publishing for `@sjunepark/darty`:

- Publisher: GitHub Actions
- Organization or user: `sjunepark`
- Repository: `darty`
- Workflow filename: `release.yml`

Configure this secret in this private repository:

- `OPEN_CREO_RELEASE_TOKEN`: fine-grained GitHub token that can create releases and upload assets in `open-creo/open-creo`. Grant repository Contents read/write access and authorize org SSO if required.

The public repository must allow release creation by the token owner. npm publishing uses OIDC trusted publishing, so no npm publish token is required.

Ensure this repository can use the native runner labels in `.github/workflows/release.yml`, including the Linux arm64 and macOS arm64 runners. If your GitHub plan or organization uses different arm runner labels, update the matrix before tagging a release.

## Release flow

1. Update `package.json` version.
2. Commit the version change.
3. Push a matching tag:

```sh
git tag v0.0.5
git push origin main --tags
```

The workflow requires the tag to match `package.json` exactly. A `v0.0.5` source tag creates or updates public release tag `darty-v0.0.5` in `open-creo/open-creo`.

The workflow is rerunnable. If the npm package version already exists, npm publish is skipped and the public release assets are uploaded with `--clobber`.

Release binaries are built and smoke-tested on native GitHub-hosted runners for Linux x64, Linux arm64, macOS x64, macOS arm64, and Windows x64. The workflow uses the Bun version pinned in `package.json`.

## Local binary build

Build all release assets locally:

```sh
bun run build:binaries
```

Build and smoke-test one native target while testing the script:

```sh
bun run build:binaries --target bun-darwin-arm64 --outdir /tmp/darty-bin --smoke-test
```

Release archives and `checksums.txt` are written under `dist-bin/release/` by default.
