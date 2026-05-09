# Release

This repo publishes two artifacts for the same `package.json` version:

- npm package: `@sjunepark/darty`
- standalone Bun-compiled binaries uploaded to `open-creo/open-creo` GitHub Releases

## Manual setup

Configure these secrets in this private repository:

- `NPM_TOKEN`: npm **Automation** access token for publishing `@sjunepark/darty`. Keep npm 2FA enabled; automation tokens do not require an OTP in CI.
- `OPEN_CREO_RELEASE_TOKEN`: fine-grained GitHub token that can create releases and upload assets in `open-creo/open-creo`. Grant repository Contents read/write access and authorize org SSO if required.

The public repository must allow release creation by the token owner.

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

## Local binary build

Build all release assets locally:

```sh
bun run build:binaries
```

Build one target while testing the script:

```sh
bun run build:binaries --target bun-darwin-arm64 --outdir /tmp/darty-bin
```

Release archives and `checksums.txt` are written under `dist-bin/release/` by default.
