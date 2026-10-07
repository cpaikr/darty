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
# Hash stdin: GNU sha256sum escapes its output when a file name has a backslash.
sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum <"$1" | awk '{ print $1 }'
  else
    shasum -a 256 <"$1" | awk '{ print $1 }'
  fi
}
expected=$(awk -v name="$archive_name" '$2 == name { print $1 }' "$checksums")
[ "${#expected}" -eq 64 ] || fail "Missing or duplicate archive checksum."
case "$expected" in *[!0-9a-f]*) fail "Invalid SHA-256 checksum." ;; esac
[ "$(sha256 "$archive")" = "$expected" ] || fail "Archive checksum mismatch; existing installation was not changed."
# Only the two tool-owned regular files may be extracted.
[ "$(tar -tzf "$archive")" = "darty
LICENSE.md" ] || fail "Unexpected archive contents."
[ "$(tar -tvzf "$archive" | cut -c1 | sort -u)" = '-' ] || fail "Archive must contain only regular files."
mkdir -p "$bin_dir"
# The receipt records the physical directory, which JSON must be able to carry.
bin_dir=$(CDPATH='' cd -- "$bin_dir" && pwd -P)
case "$bin_dir" in *[[:cntrl:]]*) fail "The installation directory path must not contain control characters." ;; esac
stage=$(mktemp -d "$bin_dir/.darty-install.XXXXXX")
trap 'rm -rf "$stage"' EXIT HUP INT TERM
tar -xzf "$archive" -C "$stage"
chmod 755 "$stage/darty"
# Check the candidate before a same-filesystem atomic rename replaces the old binary.
"$stage/darty" --help >/dev/null
# The receipt lets `darty upgrade` manage exactly this executable.
executable_json=$(printf '%s' "$bin_dir/darty" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"schemaVersion":1,"manager":"standalone","version":"@@VERSION@@","target":"%s","executable":"%s","releaseRepository":"cpaikr/darty","releaseTag":"v@@VERSION@@","assetName":"%s","sha256":"%s"}\n' \
  "$target" "$executable_json" "$archive_name" "$(sha256 "$stage/darty")" >"$stage/receipt.json"
mv -f "$stage/darty" "$bin_dir/darty"
mv -f "$stage/receipt.json" "$bin_dir/.darty-receipt.json" ||
  fail "darty @@VERSION@@ was installed, but its upgrade receipt could not be written; rerun the installer."
printf 'Installed darty @@VERSION@@ to %s/darty\nAdd %s to PATH if needed.\n' "$bin_dir" "$bin_dir"
