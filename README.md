# darty

Darty is a read-only tool for searching and retrieving Korean corporate
disclosures from DART. Humans and agents can use the same `darty` CLI subprocess
contract. A Rust SDK and asynchronous Node SDK expose the same operations through
one Rust implementation.

Darty reads DART's public web surfaces. It does not use the official OpenDART API,
and changes to DART's website can affect results or parsers.

The published Rust release is
[v0.7.0](https://github.com/cpaikr/darty/releases/tag/v0.7.0). The earlier v0.6.0
CLI used Bun/TypeScript. See the [roadmap](ROADMAP.md) for subsequent work.

## Installation

Download the archive for your platform, `SHA256SUMS`, and the matching installer
from the same [public GitHub Release](https://github.com/cpaikr/darty/releases).
CLI installation requires no login, Node.js, npm, Bun, source build, or GitHub CLI.
These instructions apply to standalone releases from v0.6.0 onward; older npm
releases are no longer updated.

| Platform | `<target>` | Installer |
|---|---|---|
| Linux GNU x64 | `linux-x64-gnu` | `install.sh` |
| Linux GNU ARM64 | `linux-arm64-gnu` | `install.sh` |
| macOS Apple Silicon | `darwin-arm64` | `install.sh` |
| Windows x64 | `win32-x64` | `install.ps1` |

All release builds and automated runtime checks run on Linux. macOS and Windows
archives are cross-built; a successful build does not establish runtime
certification. Linux archives target GNU systems, not Alpine/musl. The
[release runbook](docs/release.md) records platform validation boundaries.

### macOS and Linux

Place `darty-<version>-<target>.tar.gz`, `SHA256SUMS`, and `install.sh` in the same
directory, then run:

```sh
sh install.sh "darty-<version>-<target>.tar.gz" SHA256SUMS
"$HOME/.local/bin/darty" --help
```

Replace `<version>` and `<target>` with the values in the downloaded filename.
The installer checks the host platform and SHA-256 checksum before installing.
Add `$HOME/.local/bin` to `PATH` to run `darty` from any directory. An optional
third argument selects a different installation directory.

### Windows

Download `darty-<version>-win32-x64.tar.gz`, `SHA256SUMS`, and `install.ps1`.
Run the installer in an independently launched PowerShell session; it uses the
Windows-provided `tar` command.

```powershell
.\install.ps1 -Archive ".\darty-<version>-win32-x64.tar.gz" -Checksums ".\SHA256SUMS"
& "$env:LOCALAPPDATA\darty\bin\darty.exe" --help
```

The default directory is `%LOCALAPPDATA%\darty\bin`. Verify that exact path from
an independent terminal before adding it to your user `PATH`. Shells launched
by packaged desktop apps can redirect writes to private storage. See
[Windows installation and recovery](docs/windows-installation.md) for path
verification, an alternative destination, and persistent or current-session
`PATH` setup. Follow your organization's script review and execution policy.

### Unattended installation

Agents and scripts can install or update without a browser, login, or GitHub
CLI. GitHub's latest-release links serve the current release's files, and the
release manifest names its version. On macOS and Linux, set `target` from the
table above:

```sh
base=https://github.com/cpaikr/darty/releases/latest/download
target=linux-x64-gnu
version=$(curl -fsSL "$base/release-manifest.json" | sed -n 's/^ *"version": "\(.*\)",$/\1/p')
for name in "darty-$version-$target.tar.gz" SHA256SUMS install.sh; do curl -fsSLO "$base/$name"; done
sh install.sh "darty-$version-$target.tar.gz" SHA256SUMS
```

On Windows, in PowerShell:

```powershell
$base = "https://github.com/cpaikr/darty/releases/latest/download"
$bin = "$env:LOCALAPPDATA\darty\bin"
$version = (Invoke-RestMethod "$base/release-manifest.json" -UseBasicParsing).version
$archive = "darty-$version-win32-x64.tar.gz"
foreach ($name in $archive, "SHA256SUMS", "install.ps1") { Invoke-WebRequest "$base/$name" -OutFile $name -UseBasicParsing }
.\install.ps1 -Archive ".\$archive" -Checksums ".\SHA256SUMS" -BinDirectory $bin
```

Run these in an empty working directory. The installer still verifies the
checksum, so files from two different releases cannot be combined. To update an
existing installation elsewhere, pass its directory as the third `install.sh`
argument, or set `$bin` to it on Windows.

On Windows, a shell started by a packaged desktop app, including an agent's
shell, may not see the same files as other programs. The installer refuses a
redirected destination and does not change `PATH`. After a first installation,
[add `$bin` to the user `PATH`](docs/windows-installation.md#add-the-directory-to-the-user-path).
Then [`scripts/verify-windows-install.ps1`](scripts/verify-windows-install.ps1)
confirms the result from a process outside the calling app. Without a checkout,
download the script first:

```powershell
Invoke-WebRequest "https://raw.githubusercontent.com/cpaikr/darty/main/scripts/verify-windows-install.ps1" -OutFile verify-windows-install.ps1 -UseBasicParsing
.\verify-windows-install.ps1 -BinDirectory $bin -ExpectedVersion $version
```

It exits nonzero unless an independent process can see and run the executable
and `darty` resolves to it from the persisted user and machine `PATH`.

### Updates

Release checks and `--version` ship from v0.6.3. `darty upgrade` and
installation receipts ship from v0.7.0.

`darty --version` prints the installed version. `darty version --check`
compares it with the latest stable release and reports whether that release has
a complete download for your platform and how fresh the evidence is.

After successful DART network commands, the CLI also checks for a newer stable
release and, when there is something to report, adds one entry to the JSON
`advisories` array; the command result and exit status do not change. Release
checks contact `github.com` and GitHub's release asset host in addition to
DART, cache the evidence for 24 hours, and retry a failed refresh after 1 hour.
A refresh may add up to 1.5 seconds to a command. The cache is disposable and
lives in `%LOCALAPPDATA%\darty\cache` on Windows, `~/Library/Caches/darty` on
macOS, and `$XDG_CACHE_HOME/darty` or `~/.cache/darty` on Linux; set
`DARTY_CACHE_DIR` to an absolute path to override it. Set
`DARTY_NO_UPDATE_CHECK=1` to disable all release checks. Release checks never
install anything.

The installers write `.darty-receipt.json` beside the executable, recording its
version, target, path, release, and SHA-256 digest. Keep it there; it lets the
CLI upgrade that exact installation:

```sh
darty upgrade --check
darty upgrade
```

`upgrade --check` reports whether a newer stable release exists, and whether
it has an archive for this platform, without downloading release assets. `upgrade` downloads this platform's archive from the
latest release, verifies it against the release manifest and `SHA256SUMS`,
requires the archive to hold only the executable and license, and requires the
new executable to report the release version. It then replaces the executable
followed by its receipt. If a step fails, the previous installation is restored,
or the JSON error's `recoveryHint` names the remaining step. Both commands print
JSON; in a terminal they also write progress stages to stderr. Upgrades contact
`github.com` and GitHub's release asset host; `DARTY_NO_UPDATE_CHECK` does not
disable an explicit upgrade. One upgrade runs per installation at a time,
holding `.darty-upgrade.lock` beside the executable. On Windows the replaced
executable remains as `.darty-old-<pid>.exe` until a later upgrade removes it,
and an upgrade from a shell whose writes are redirected to private storage is
refused like the installer's. If a Windows upgrade is killed mid-replacement
and `darty.exe` is missing, rename that `.darty-old-<pid>.exe` back to
`darty.exe` or reinstall.

An executable without a matching receipt, including every installation made
before receipts existed, is left unchanged: `darty upgrade` reports
`unmanaged_installation`. Update it once by downloading the files from a newer
release and repeating the installation procedure, which writes the receipt.
The installer leaves the existing executable in place if checksum verification
or the new executable's startup check fails. Always use an archive, installer,
and checksums from the same release in this repository.

The Windows installers in v0.6.1 through v0.6.3 fail with a path error when
`darty.exe` already exists in the destination. To update to one of those
releases, rename the existing `darty.exe` first; the installer then installs
normally. Releases from v0.6.4 replace the existing executable directly.

## CLI

```bash
darty --help
darty search-body --keyword 배당 --start-date 20250331 --end-date 20260331
```

Korean search terms and DART labels are retained in examples because they refer
to source content. `배당` means dividends.

CLI help is the reference for commands, options, input constraints, and output
behavior. Running `darty` with no arguments prints the same root help as
`darty --help`. For one command:

```bash
darty <command> --help
```

Most query commands write one JSON response object to stdout for either success
or failure. Failures exit with a nonzero status; diagnostics use stderr. Search
commands offer `--agent` for compact JSON and contextual `help[]` hints while
preserving identifiers and sources needed for follow-up calls. `report-guide`
and help output remain human-readable text. See the
[CLI transport contract](docs/specs/cli-transport-v1.md) for process details.

| Command | Purpose |
|---|---|
| `search-body` | Search disclosure body content. |
| `search-company` | Find DART company codes. |
| `search-company-reports` | Search filings for a company. |
| `company-detail` | Retrieve company details. |
| `company-rss` | Retrieve a company's disclosure RSS feed. |
| `disclosure-types` | Discover detailed disclosure type codes. |
| `report-guide` | Print a Markdown guide to finding information in DART reports. |
| `view-report` | Retrieve a report's table of contents or body content. |

## Request pacing

The source implementation defaults to a 500 ms minimum request interval across
CLI and SDK processes using the same local state directory. Pacing ships from
v0.6.2.

Each request waits before sending while holding a shared lock, including the
first request; the lock stays held until the response completes. This deliberate
cooldown also protects requests following a cancelled or killed process.

Set `DARTY_REQUEST_INTERVAL_MS` to an integer from `0` through `60000` to change
the interval (milliseconds). Use `0` only for controlled fixture/test runs; it
disables pacing and shared-state access. With differing nonzero settings, the
gap respects the larger interval of the preceding and current request.

Shared state defaults to `%LOCALAPPDATA%\darty` on Windows and
`$XDG_STATE_HOME/darty` (or `$HOME/.local/state/darty`) on macOS/Linux.
`DARTY_STATE_DIR` overrides this with an absolute local directory path. All
participating processes must use the same directory. Do not delete or replace
`request-pacing-v1.lock` while any Darty process is running. Unusable or damaged
state fails before a request is sent, with a recovery hint.
Bundled `report-guide` and `disclosure-types` operations do not require pacing
configuration or state.

Pacing does not coordinate separate machines or users with different state
directories, and does not guarantee that DART will permit a request. No official
DART rate limit is established. See the [provider policy](docs/research/dart-provider-qualification.md#pacing).

## Agent skill

The consumer skill source is in [`skill/darty`](skill/darty/SKILL.md). It guides
agents through company and filing discovery, report sections, and citations,
and loads installation guidance only when the executable is needed.

Copy the complete `skill/darty` directory into a skill location supported by
your agent, including `references/` and `agents/`. The installed skill can apply
implicitly to DART research requests or be invoked explicitly with `$darty`.
Install the executable separately using the instructions above. Skill source in
this repository does not imply release-artifact distribution or local registration.

## SDK and local development

The [Rust SDK](crates/darty/) and [asynchronous Node SDK](packages/node/) share
the CLI's Rust implementation. The Node SDK requires Node.js 22.12.0 or newer.

GitHub Releases provide a Rust `.crate` archive and platform-specific Node
`.tgz` archives for Linux GNU x64 and macOS Apple Silicon. Each Node archive
includes its native addon. There is no npm registry publication or npm CLI
launcher. The [release runbook](docs/release.md#sdk-consumption)
owns SDK installation, version compatibility, and validation limits. CLI users
do not need the Node SDK.

For local development, install dependencies and build with Rust toolchain 1.88.0:

```sh
bun install
bun run build
./target/release/darty --help
```

Bun is used for development and validation tooling. Contributor checks are
listed in [AGENTS.md](AGENTS.md#commands).

## Usage boundaries

Darty provides source data, not investment, accounting, or legal judgments.
Verify the original DART links and references before using results for important
decisions.

## Documentation

- [Product direction and non-goals](VISION.md)
- [Implementation architecture](ARCHITECTURE.md)
- [Delivery status and backlog](ROADMAP.md)
- [Capability and transport contracts](docs/specs/README.md)
- [Evaluation guidance](evals/README.md)
- [Release operations](docs/release.md)

## License

Elastic License 2.0. See [LICENSE.md](LICENSE.md).
