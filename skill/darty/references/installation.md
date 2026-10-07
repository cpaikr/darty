# Install or recover the executable

Read the canonical [Darty installation guide](https://github.com/cpaikr/darty/blob/main/README.md#installation)
for prerequisites, platform selection, public release downloads,
checksum verification, installation, PATH, and upgrades. Follow its branch for
the user's operating system and chosen destination. Installation facts live
there so this package does not maintain a second installer recipe.

The [public GitHub Releases](https://github.com/cpaikr/darty/releases) channel
provides artifacts without login. If the guide or release cannot be accessed,
report the unavailable resource and request user-provided release files;
do not invent an npm installation command or substitute a source build.

When the user has authorized installation or updates, do the work yourself:
the guide's unattended installation commands need no browser, login, or manual
download. Apply installation changes within the user's existing authorization. An
update notice alone is not an upgrade request. When the installed help lists
`upgrade`, run `darty upgrade` for an authorized update; if it reports
`unmanaged_installation`, use the guide's installation procedure once, which
lets later updates use `darty upgrade`. Keep the archive, checksums, and
installer from the same release in this repository and use its verification
procedure before installing.

Verify `darty --help` first through the actual executable's full path, then by
command name in the intended consumer shell. File visibility and PATH lookup
are distinct. For Windows redirected paths or a stale shell PATH, follow the
guide's recovery steps for the selected destination. A working installer
subprocess alone does not prove the user's terminal can see the executable; on
Windows, run the guide's `verify-windows-install.ps1` check, which tests
visibility from a process outside your own shell, instead of asking the user to
open a terminal.

After verification, resume the original task. CLI installation does not
require SDK installation or OpenDART API credentials.
