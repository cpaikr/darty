#!/usr/bin/env bash
set -euo pipefail
# Linux-only build containers pin the linker, SDK, and compiler helpers by digest.
target="$1"
rust_target="$2"
case "$target" in
  win32-x64)
    image='ghcr.io/rust-cross/cargo-xwin@sha256:10fa1f350addf9c59345954f9d6eb10e353ba481c6130757a5c95d8daad37191'
    builder='xwin build'
    ;;
  *)
    image='ghcr.io/rust-cross/cargo-zigbuild@sha256:9b4f6b3eb9e8f9fefb3960fe288ddba576627d66d9eff851ce7f62d2455564a5'
    builder='zigbuild'
    ;;
esac
# GNU artifacts target glibc 2.28. The SDK-bearing container also cross-links
# Apple's Security frameworks used by the system trust verifier.
build_target="$rust_target"
case "$target" in linux-*) build_target="$rust_target.2.28" ;; esac
packages='-p darty-cli'
case "$target" in linux-x64-gnu|darwin-arm64) packages="$packages -p darty-node" ;; esac
docker run --rm --platform linux/amd64 --entrypoint bash \
  -v "$PWD:/io" -w /io \
  -e RUST_TARGET="$rust_target" -e BUILD_TARGET="$build_target" \
  -e BUILDER="$builder" -e BUILD_PACKAGES="$packages" \
  -e MACOSX_DEPLOYMENT_TARGET=11.0 \
  "$image" -c '
    set -euo pipefail
    rustup toolchain install 1.88.0 --profile minimal
    rustup target add --toolchain 1.88.0 "$RUST_TARGET"
    cargo +1.88.0 $BUILDER --release --locked --target "$BUILD_TARGET" $BUILD_PACKAGES
  '
