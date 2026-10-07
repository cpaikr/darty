# CLI upgrade

Status: merged ([#45](https://github.com/cpaikr/darty/pull/45)); released in v0.7.0 on 2026-10-07.

Adopt the upgrade-ownership part of the mytech
[standalone CLI distribution practice](https://github.com/sjunepark/mytech/blob/main/practices/standalone-cli-distribution.md#upgrade-ownership)
and its [progress reporting practice](https://github.com/sjunepark/mytech/blob/main/practices/cli-progress-reporting.md),
following the shape of `kasb upgrade`. This supersedes the "no installation"
boundary of the [CLI version checking plan](cli-version-checking.md): release
checks still never install anything, and installation is the explicit
`darty upgrade` command. The practices own the general rules; this record
keeps the darty-specific decisions.

## Decisions

- **Owner request.** The owner asked on 2026-10-06 for an `upgrade` command
  like kasb's, so the CLI now owns upgrades of its own standalone
  installations. [CLI transport v1](../docs/specs/cli-transport-v1.md#upgrade-command)
  owns the command contract and the [README](../README.md#updates) owns usage.
- **Receipt ownership.** Both installers write `.darty-receipt.json` beside the
  executable (schema 1: version, target, executable path, `cpaikr/darty`, tag,
  archive name, executable SHA-256). `darty upgrade` changes only an executable
  whose canonical path and digest match its receipt. Installations from v0.6.4
  and earlier have no receipt and report `unmanaged_installation`; one
  reinstall through the README procedure makes them managed. Path layout never
  authorizes replacement.
- **Release discovery.** Reuse the version-check source: the latest-release
  `release-manifest.json` link, which avoids the REST API rate limit, then
  versioned `releases/download/<tag>/` asset links. GitHub immutable releases
  are not enabled, so trust rests on the publisher's verified bundle and these
  checks rather than release metadata.
- **Verification.** The archive name and digest come from the manifest and must
  equal the single `SHA256SUMS` entry and the downloaded bytes. The archive must
  hold exactly the executable and `LICENSE.md` as regular files, and the staged
  executable must print `darty <version>` for `--version` within 10 seconds.
- **Replacement.** Stage beside the executable and refuse a staged file whose
  physical path leaves the installation directory (packaged-app redirection).
  Publish the executable before the receipt, then flush the directory on Unix.
  Unix keeps a hard-link backup and renames atomically over the executable.
  Windows renames the running executable aside, which it permits on one volume,
  instead of kasb's deferred PowerShell helper: replacement completes before the
  command returns, and the set-aside `.darty-old-<pid>.exe` is removed by a later
  upgrade. Failure restores the executable and receipt, or reports
  `upgrade_recovery_required` with the remaining step.
- **Output.** One JSON envelope (`metadata.output: "upgrade"`). Stage lines go
  to stderr only when stderr is a terminal. `--check` never downloads assets.
  `--check` reports a release without this target's archive as success with
  `distribution: "incomplete_distribution"`; a real upgrade fails on it.
  `DARTY_NO_UPDATE_CHECK` disables only incidental and `version --check`
  release checks, not an explicit upgrade.
- **Concurrency and interruption.** A real upgrade holds an exclusive lock on
  `.darty-upgrade.lock` beside the executable through publication. It inspects
  the receipt before locking, so an unmanaged installation gains no lock file,
  and again under the lock. A second upgrade fails fast and retryably. Ctrl-C has no special handling. An
  interruption leaves the previous installation, a receipt mismatch that one
  reinstall repairs, or on Windows a missing `darty.exe` recoverable from
  `.darty-old-<pid>.exe` or by reinstalling. The next upgrade removes leftover
  staged files and backups once the installation matches its receipt.
- **Transport.** Release HTTP requests, including redirects, are HTTPS-only
  outside fixture builds.
- **Installer edge cases.** The installers replace the executable before the
  receipt and name the rerun step if the receipt write fails. A non-UTF-8 Unix
  installation path yields a receipt the CLI rejects; that edge case is
  accepted.
- **Advisories.** The `update_available` advisory and `version --check` help now
  point to `darty upgrade`, with the README procedure for installations without
  a receipt.

## Validation

- `crates/darty-cli/src/upgrade.rs` unit tests: checksum list parsing, archive
  entry set, manifest selection, receipt matching, publication, rollback, and
  unrecoverable-state hints.
- `crates/darty-cli/tests/upgrade.rs` runs a copied fixture build as an older
  managed installation against a local release origin: `--check` downloads
  nothing, `upgrade` replaces the running executable and receipt, checksum and
  version mismatches leave the installation unchanged, an incomplete release is
  reported by `--check` and refused by `upgrade`, leftovers of interrupted
  upgrades are removed, and unmanaged or mismatched receipts make no request. Passed on Windows 11 x64 and on Linux
  x64 (WSL) on 2026-10-06.
- `test/release/standalone.test.ts` checks the receipt both installers write;
  the PowerShell case ran on Windows. CI certification in
  `scripts/standalone.mjs` asserts the Linux installer's receipt and that a
  failed install leaves it unchanged.
- A receipt written by the rendered `install.ps1` passed `darty upgrade`
  inspection on Windows.

## Next action

After the next release is published, run `darty upgrade` on the receipt-managed
Windows v0.7.0 installation recorded in the
[release runbook](../docs/release.md#windows-validation-records) and record the
result there.
