# darty

Darty is a read-only tool for searching and retrieving Korean corporate
disclosures from DART. Humans and agents can use the same `darty` CLI subprocess
contract. A Rust SDK and asynchronous Node SDK expose the same operations through
one Rust implementation.

Darty reads DART's public web surfaces. It does not use the official OpenDART API,
and changes to DART's website can affect results or parsers.

The published Rust release is
[v0.6.1](https://github.com/cpaikr/darty/releases/tag/v0.6.1). The earlier v0.6.0
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

### Updates

Download the files from a newer release and repeat the installation procedure.
The installer leaves the existing executable in place if checksum verification
or the new executable's startup check fails. Always use an archive, installer,
and checksums from the same release in this repository.

## CLI

```bash
darty --help
darty search-body --keyword 배당 --start-date 20250331 --end-date 20260331
```

Korean search terms and DART labels are retained in examples because they refer
to source content. `배당` means dividends.

CLI help is the reference for commands, options, input constraints, and output
behavior:

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
