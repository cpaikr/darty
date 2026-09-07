#!/bin/sh
# Download this installer, your archive, and SHA256SUMS from the same private release.
set -eu
fail() { printf '%s\n' "$*" >&2; exit 1; }
[ "$#" -ge 2 ] && [ "$#" -le 3 ] || fail "Usage: sh install.sh ARCHIVE SHA256SUMS [BIN_DIRECTORY]"
archive=$1
checksums=$2
bin_dir=${3:-"$HOME/.local/bin"}
[ -f "$archive" ] && [ -f "$checksums" ] || fail "Archive and SHA256SUMS must be local files."
case "$(uname -s):$(uname -m)" in
@@UNIX_TARGETS@@
  *) fail "No standalone archive is available for this operating system/architecture." ;;
esac
archive_name="darty-@@VERSION@@-$target.tar.gz"
[ "$(basename "$archive")" = "$archive_name" ] || fail "Expected $archive_name for this host."
expected=$(awk -v name="$archive_name" '$2 == name { print $1 }' "$checksums")
[ "${#expected}" -eq 64 ] || fail "Missing or duplicate archive checksum."
case "$expected" in *[!0-9a-f]*) fail "Invalid SHA-256 checksum." ;; esac
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$archive" | awk '{ print $1 }')
else
  actual=$(shasum -a 256 "$archive" | awk '{ print $1 }')
fi
[ "$actual" = "$expected" ] || fail "Archive checksum mismatch; existing installation was not changed."
# Only the two tool-owned regular files may be extracted.
[ "$(tar -tzf "$archive")" = "darty
LICENSE.md" ] || fail "Unexpected archive contents."
[ "$(tar -tvzf "$archive" | cut -c1 | sort -u)" = '-' ] || fail "Archive must contain only regular files."
mkdir -p "$bin_dir"
stage=$(mktemp -d "$bin_dir/.darty-install.XXXXXX")
trap 'rm -rf "$stage"' EXIT HUP INT TERM
tar -xzf "$archive" -C "$stage"
chmod 755 "$stage/darty"
# Check the candidate before a same-filesystem atomic rename replaces the old binary.
"$stage/darty" --help >/dev/null
mv -f "$stage/darty" "$bin_dir/darty"
printf 'Installed darty @@VERSION@@ to %s/darty\nAdd %s to PATH if needed.\n' "$bin_dir" "$bin_dir"
