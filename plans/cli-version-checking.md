# CLI version checking

Status: implemented; awaiting review and release.

Adopt the mytech
[CLI version checking practice](https://github.com/sjunepark/mytech/blob/c9e82a8/practices/cli-version-checking.md)
for the standalone `darty` CLI: cached, advisory release comparison after
successful network operations, an explicit version report, and no
self-installation. The practice owns the general rules; this plan records the
darty-specific decisions and delivery.

## Accepted decisions

Owner-approved on 2026-09-30.

- **Envelope advisory, empty stderr.** Incidental notices go in a new optional
  top-level `advisories` array in the single JSON envelope, separate from
  `result` and from `warnings`, which describe the capability result. The key is
  omitted when there is nothing to report, so opted-out, fixture, and fresh-equal
  output stays byte-identical to today. stderr remains empty by default.
  The addition is backward compatible, so `cliTransportVersion` stays `"1"`.
- **Command surface.** `darty --version` prints `darty <version>` locally and
  exits `0`. `darty version` prints a local JSON envelope with the embedded
  version and release target; `darty version --check` adds the release
  comparison and freshness even when no update exists. Both are new CLI v1
  surface.
- **On by default.** Checks run without configuration and contact
  `github.com` and the release asset host in addition to DART.
  `DARTY_NO_UPDATE_CHECK=1` skips all inspection, fetching, and cache work.

## Scope boundaries

- CLI only. The check lives in `crates/darty-cli`; the `darty` SDK crate and
  the Node SDK never contact GitHub.
- Incidental checks run only after a successful network capability operation
  (`search-body`, `company-detail`, `company-rss`, `search-company`,
  `search-company-reports`, `view-report`). Help, bare `darty`, `--version`,
  bundled `disclosure-types` and `report-guide`, invalid invocations, failures,
  and cancellation stay local and unchecked, matching the request-pacing rule
  that bundled operations remain local.
- Fixture-origin execution never contacts GitHub. A fixture-only release origin
  override (alongside `DARTY_FIXTURE_ORIGIN`) serves test release data.
- No installation, download of archives, or other mutation. Notices link the
  exact release page and point to the README update procedure (`install.sh` /
  `install.ps1`).

## Release evidence

- **Source.** Download `release-manifest.json` through GitHub's documented
  latest-release asset link,
  `https://github.com/cpaikr/darty/releases/latest/download/release-manifest.json`.
  It is served by `github.com` and the release asset host, not the REST API,
  so the unauthenticated API limit (60 requests per hour per IP, shared by
  everything behind that address) does not apply. GitHub's latest release is
  never a draft or prerelease; the manifest must name a plain `v<version>` tag.
  A 404 means no published release provides a manifest (`no_stable_release`).
  Owner-approved on 2026-09-30, replacing the earlier release-list selection:
  "latest" is GitHub's Latest marker, which matches the highest version while
  releases are not published for older lines.
- **Comparison.** Compare against the embedded `CARGO_PKG_VERSION`. Distinguish
  `newer`, `equal`, `ahead`, `no_stable_release`, and `uncomparable` (the
  running version does not parse as a plain release version). Equality does not
  prove source freshness; a local `dev` build reports `equal`.
- **Distribution.** Before reporting an update as installable, require a
  manifest entry for the running target (from `scripts/release-targets.json`).
  Otherwise report `incomplete_distribution` for that release; do not fall back
  to an older one. Release completion uploads and verifies every asset on a
  draft before publishing, so a published manifest implies its archives,
  `SHA256SUMS`, and installers exist.
  Surface the manifest's `runtimeCertified` value without treating `false` as
  incomplete. Installation still verifies archive bytes.
- **Freshness.** Report `fresh`, `stale` (refresh failed; prior evidence kept
  with its observation time and age), or `unavailable` (no usable evidence).
  Never claim the CLI is current without usable evidence.

## Cache and refresh budget

- Cache file under a disposable user cache directory, separate from the pacing
  state directory and installation: `%LOCALAPPDATA%\darty\cache` on Windows,
  `$XDG_CACHE_HOME/darty` or `~/.cache/darty` on Linux, and
  `~/Library/Caches/darty` on macOS. `DARTY_CACHE_DIR` overrides it with an
  absolute path. The cache holds release evidence, observation time, and the
  last failed attempt; the comparison is recomputed from the running version on
  every check, so replacing the executable takes effect immediately.
- Refresh when evidence is older than 24 hours; after a failed refresh, wait 1
  hour before retrying. DART calls dominate invocation latency, and agents may
  run the CLI many times per hour, so a daily interval keeps release traffic
  negligible even when many processes share one address.
- One foreground refresh budget of 1.5 seconds covers the connection and the
  manifest request; it may extend process completion by at most that much.
  Cap the manifest at 64 KiB.
- Write the cache by atomic replace; concurrent processes may refresh
  redundantly but never read a partial file. Unreadable or corrupt cache is
  treated as absent and reported as an inspection problem, never a command
  failure.

## Output

- Incidental advisories are omitted for fresh `equal`, `ahead`, and
  `no_stable_release` results. Updates, incomplete distribution, stale or
  unavailable evidence, uncomparable identity, and cache problems produce one
  advisory entry, also under `--agent`. An advisory never changes the exit code
  or the primary result.
- `darty version --check` always reports current version, target, latest stable
  version, comparison, freshness, observation time and age, distribution status,
  and the release URL when known. An evidence problem is part of the report and
  exits `0`.

## Delivery

One reviewable PR to `dev` containing the implementation, tests, and contract
updates:

- `docs/specs/cli-transport-v1.md`: `advisories`, `darty --version`, `darty version`.
- `README.md`: update checks, network destinations, cache location, opt-out.
- `ARCHITECTURE.md`: CLI ownership of release checks.
- `skill/darty/SKILL.md`, which says `--version` is outside the v1 contract.

Release tagging and publication remain separate gates under
[the release runbook](../docs/release.md).

## Validation

- Unit tests for version ordering, stable selection, target and asset
  completeness, freshness states, retry cooldown, cache corruption, and opt-out.
- CLI subprocess tests against a local fixture release server: update notice
  present, quiet when equal, stale label after a failed refresh, budget
  exhaustion stays advisory, primary JSON unchanged apart from `advisories`,
  stderr empty, and no check after failures, help, or bundled operations.
- Existing CLI compatibility checks pass unchanged with checks opted out or in
  fixture mode.
- Repository-required Rust tests, Clippy, typecheck, and version checks.

## Implementation decisions

- `crates/darty-cli/src/release_check.rs` owns evidence, cache, and reports;
  `crates/darty-cli/tests/release_check.rs` covers the subprocess behavior with
  `DARTY_FIXTURE_RELEASE_ORIGIN`, which production packaging rejects.
- `DARTY_NO_UPDATE_CHECK` (any non-empty value except `0`) also disables
  `darty version --check`, which then reports the opt-out as a problem.
- Each refresh first records the attempt as the last failure. Incidental checks
  refresh only when that write succeeds, so an unresolvable, unreadable, or
  unwritable cache cannot turn every invocation into GitHub requests; the
  explicit check still refreshes.
- The 1.5 second budget bounds the network refresh; the local cache write
  follows it. JSON success paths exit once stdout is flushed, so an abandoned
  blocking DNS lookup cannot delay process exit.
- Observed on 2026-09-30 from Windows: a release-build explicit refresh against
  the real latest-release link took about 0.35 s after the first launch.
- Each invocation emits at most one advisory, preferring uncomparable identity,
  then an update or incomplete distribution (labelled stale when applicable),
  then stale or unavailable evidence, then cache problems.
- The root-help compat golden now expects `--version` and `version`.

## Next action

Review and merge the implementation PR to `dev`; publication follows the
release runbook.
